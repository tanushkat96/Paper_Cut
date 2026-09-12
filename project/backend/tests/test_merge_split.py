from io import BytesIO
from zipfile import ZipFile

import fitz  # PyMuPDF
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _make_pdf_bytes(num_pages: int = 1) -> bytes:
    """Builds a minimal valid in-memory PDF with the given number of pages."""
    doc = fitz.open()
    for _ in range(num_pages):
        doc.new_page()
    data = doc.tobytes()
    doc.close()
    return data


# ---------------------------------------------------------------------------
# Merge PDF
# ---------------------------------------------------------------------------

def test_merge_two_valid_pdfs():
    pdf_a = _make_pdf_bytes(1)
    pdf_b = _make_pdf_bytes(2)

    resp = client.post(
        "/api/v1/pdf/merge",
        files=[
            ("files", ("a.pdf", BytesIO(pdf_a), "application/pdf")),
            ("files", ("b.pdf", BytesIO(pdf_b), "application/pdf")),
        ],
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"

    merged = fitz.open(stream=resp.content, filetype="pdf")
    assert merged.page_count == 3  # 1 + 2
    merged.close()


def test_merge_three_valid_pdfs_preserves_order():
    # Each PDF gets a distinct page count so we can verify order by page count sequence.
    pdfs = [_make_pdf_bytes(1), _make_pdf_bytes(2), _make_pdf_bytes(3)]

    resp = client.post(
        "/api/v1/pdf/merge",
        files=[
            ("files", (f"doc{i}.pdf", BytesIO(data), "application/pdf"))
            for i, data in enumerate(pdfs)
        ],
    )
    assert resp.status_code == 200
    merged = fitz.open(stream=resp.content, filetype="pdf")
    assert merged.page_count == 1 + 2 + 3
    merged.close()


def test_merge_rejects_single_file():
    pdf_a = _make_pdf_bytes(1)
    resp = client.post(
        "/api/v1/pdf/merge",
        files=[("files", ("a.pdf", BytesIO(pdf_a), "application/pdf"))],
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "TOO_FEW_FILES"


def test_merge_rejects_corrupted_pdf():
    good = _make_pdf_bytes(1)
    bad = b"%PDF-1.4 not a real pdf body"

    resp = client.post(
        "/api/v1/pdf/merge",
        files=[
            ("files", ("good.pdf", BytesIO(good), "application/pdf")),
            ("files", ("bad.pdf", BytesIO(bad), "application/pdf")),
        ],
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "CORRUPTED_DOCUMENT"


def test_merge_rejects_non_pdf_upload():
    good = _make_pdf_bytes(1)
    resp = client.post(
        "/api/v1/pdf/merge",
        files=[
            ("files", ("good.pdf", BytesIO(good), "application/pdf")),
            ("files", ("notes.txt", BytesIO(b"hello"), "text/plain")),
        ],
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


def test_merge_rejects_empty_upload():
    resp = client.post("/api/v1/pdf/merge", files=[])
    assert resp.status_code in (400, 422)


# ---------------------------------------------------------------------------
# Split PDF
# ---------------------------------------------------------------------------

def test_split_one_page_pdf():
    pdf_bytes = _make_pdf_bytes(1)
    resp = client.post(
        "/api/v1/pdf/split",
        files={"file": ("single.pdf", BytesIO(pdf_bytes), "application/pdf")},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/zip"

    with ZipFile(BytesIO(resp.content)) as zf:
        names = zf.namelist()
        assert names == ["page-1.pdf"]
        inner = fitz.open(stream=zf.read("page-1.pdf"), filetype="pdf")
        assert inner.page_count == 1
        inner.close()


def test_split_multi_page_pdf_default_every_page():
    pdf_bytes = _make_pdf_bytes(4)
    resp = client.post(
        "/api/v1/pdf/split",
        files={"file": ("multi.pdf", BytesIO(pdf_bytes), "application/pdf")},
    )
    assert resp.status_code == 200

    with ZipFile(BytesIO(resp.content)) as zf:
        names = sorted(zf.namelist())
        assert names == ["page-1.pdf", "page-2.pdf", "page-3.pdf", "page-4.pdf"]
        for name in names:
            inner = fitz.open(stream=zf.read(name), filetype="pdf")
            assert inner.page_count == 1
            inner.close()


def test_split_with_custom_page_ranges():
    pdf_bytes = _make_pdf_bytes(7)
    resp = client.post(
        "/api/v1/pdf/split",
        files={"file": ("multi.pdf", BytesIO(pdf_bytes), "application/pdf")},
        data={"page_ranges": "1-3,5,7"},
    )
    assert resp.status_code == 200

    with ZipFile(BytesIO(resp.content)) as zf:
        names = zf.namelist()
        assert names == ["pages-1-3.pdf", "page-5.pdf", "page-7.pdf"]
        first = fitz.open(stream=zf.read("pages-1-3.pdf"), filetype="pdf")
        assert first.page_count == 3
        first.close()


def test_split_rejects_out_of_bounds_range():
    pdf_bytes = _make_pdf_bytes(3)
    resp = client.post(
        "/api/v1/pdf/split",
        files={"file": ("multi.pdf", BytesIO(pdf_bytes), "application/pdf")},
        data={"page_ranges": "1-5"},
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_PAGE_RANGE"


def test_split_rejects_malformed_range():
    pdf_bytes = _make_pdf_bytes(3)
    resp = client.post(
        "/api/v1/pdf/split",
        files={"file": ("multi.pdf", BytesIO(pdf_bytes), "application/pdf")},
        data={"page_ranges": "abc"},
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "INVALID_PAGE_RANGE"


def test_split_rejects_corrupted_pdf():
    bad = b"%PDF-1.4 not a real pdf body"
    resp = client.post(
        "/api/v1/pdf/split",
        files={"file": ("bad.pdf", BytesIO(bad), "application/pdf")},
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "CORRUPTED_DOCUMENT"


def test_split_rejects_non_pdf_upload():
    resp = client.post(
        "/api/v1/pdf/split",
        files={"file": ("notes.txt", BytesIO(b"hello"), "text/plain")},
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "UNSUPPORTED_FILE_TYPE"
