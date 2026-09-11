from pathlib import Path

from app.utils.file_validation import sanitize_filename


def save_upload(contents: bytes, workspace: Path, original_filename: str) -> Path:
    safe_name = sanitize_filename(original_filename)
    input_path = workspace / safe_name
    input_path.write_bytes(contents)
    return input_path
