import tempfile
from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient

from app.core import config as config_module
from app.main import app
from app.services import word_to_pdf

client = TestClient(app)


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_word_to_pdf_rejects_unsupported_extension():
    file_bytes = BytesIO(b"not a real docx")
    resp = client.post(
        "/api/v1/convert/word-to-pdf",
        files={"file": ("notes.txt", file_bytes, "text/plain")},
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


def test_pdf_to_word_rejects_unsupported_extension():
    file_bytes = BytesIO(b"not a real pdf")
    resp = client.post(
        "/api/v1/convert/pdf-to-word",
        files={"file": ("image.png", file_bytes, "image/png")},
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


def test_word_to_pdf_rejects_empty_file():
    file_bytes = BytesIO(b"")
    resp = client.post(
        "/api/v1/convert/word-to-pdf",
        files={"file": ("empty.docx", file_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


def test_pdf_to_word_rejects_corrupted_pdf():
    file_bytes = BytesIO(b"%PDF-1.4 this is not a valid pdf body")
    resp = client.post(
        "/api/v1/convert/pdf-to-word",
        files={"file": ("broken.pdf", file_bytes, "application/pdf")},
    )
    assert resp.status_code in (422, 400)
    assert resp.json()["error"]["code"] in ("CORRUPTED_DOCUMENT", "NO_TEXT_LAYER")


def test_find_libreoffice_binary_uses_windows_default_path(monkeypatch):
    monkeypatch.setattr(word_to_pdf.shutil, "which", lambda name: None)
    default_path = Path("C:/Program Files/LibreOffice/program/soffice.exe")
    monkeypatch.setattr(word_to_pdf.Path, "exists", lambda self: self == default_path)

    assert word_to_pdf._find_libreoffice_binary() == str(default_path)


def test_get_libreoffice_profile_uri_uses_file_uri_format(tmp_path):
    profile_dir = tmp_path / ".libreoffice-profile"
    uri = word_to_pdf._get_libreoffice_profile_uri(tmp_path)

    assert uri == profile_dir.resolve().as_uri()
    assert uri.startswith("file://")


def test_build_libreoffice_command_puts_profile_before_input(tmp_path):
    input_path = tmp_path / "demo.docx"
    workspace = tmp_path / "workspace"
    workspace.mkdir()

    cmd = word_to_pdf._build_libreoffice_command("soffice.exe", input_path, workspace)
    input_index = cmd.index(str(input_path))

    if word_to_pdf.os.name == "nt":
        assert not any(item.startswith("--env:UserInstallation=") for item in cmd)
    else:
        profile_index = next(i for i, item in enumerate(cmd) if item.startswith("--env:UserInstallation="))
        assert profile_index < input_index

    assert cmd[:3] == ["soffice.exe", "--headless", "--norestore"]


def test_default_temp_root_uses_system_tempdir(monkeypatch):
    monkeypatch.delenv("TEMP_ROOT", raising=False)
    import importlib

    importlib.reload(config_module)
    assert str(config_module.settings.TEMP_ROOT).startswith(tempfile.gettempdir())
