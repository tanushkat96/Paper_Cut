import zipfile
from pathlib import Path

import fitz  # PyMuPDF

from app.schemas.errors import ConversionFailedError, CorruptedDocumentError, ZipCreationFailedError
from app.utils.page_ranges import parse_page_ranges


def split_pdf(input_path: Path, workspace: Path, page_ranges: str | None) -> Path:
    """
    Splits a PDF into multiple PDFs, zipped into a single archive saved in
    the request workspace.

    - page_ranges is None/omitted -> split every page into its own PDF
      (page-1.pdf, page-2.pdf, ...).
    - page_ranges is provided (e.g. "1-3,5,7-9") -> one PDF per requested
      range, in the exact order requested (pages-1-3.pdf, page-5.pdf, ...).

    All intermediate PDFs and the final ZIP are written inside `workspace`,
    so the existing request_workspace() cleanup removes everything.
    """
    try:
        src_doc = fitz.open(input_path)
    except Exception as exc:
        raise CorruptedDocumentError(f"The PDF could not be opened: {exc}")

    try:
        page_count = src_doc.page_count
        if page_count == 0:
            raise CorruptedDocumentError("The PDF has no pages.")

        if page_ranges:
            ranges = parse_page_ranges(page_ranges, page_count)
        else:
            ranges = [(i + 1, i + 1) for i in range(page_count)]

        generated_paths: list[Path] = []

        for start, end in ranges:
            out_doc = fitz.open()
            try:
                # PyMuPDF page numbers are 0-indexed; our ranges are 1-indexed inclusive.
                out_doc.insert_pdf(src_doc, from_page=start - 1, to_page=end - 1)

                name = f"page-{start}.pdf" if start == end else f"pages-{start}-{end}.pdf"
                out_path = workspace / name
                out_doc.save(out_path)
                generated_paths.append(out_path)
            except Exception as exc:
                raise ConversionFailedError(f"Failed to generate PDF for range {start}-{end}: {exc}")
            finally:
                out_doc.close()
    finally:
        src_doc.close()

    zip_path = workspace / "split-pdf.zip"
    try:
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for path in generated_paths:
                zf.write(path, arcname=path.name)
    except Exception as exc:
        raise ZipCreationFailedError(f"Failed to create the ZIP archive: {exc}")

    return zip_path
