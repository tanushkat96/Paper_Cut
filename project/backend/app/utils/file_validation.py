import re
from pathlib import Path

from fastapi import UploadFile

from app.core.config import settings
from app.schemas.errors import FileTooLargeError, UnsupportedFileTypeError

_SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9._-]")


def sanitize_filename(original_name: str) -> str:
    """Never trust the original filename — strip path components and unsafe chars."""
    name = Path(original_name or "file").name
    name = _SAFE_NAME_RE.sub("_", name)
    return name or "file"


async def validate_upload(file: UploadFile, allowed_extensions: set[str], allowed_mime_types: set[str]) -> bytes:
    """
    Validates extension, MIME type, and size. Returns the file bytes on success.
    Raises UnsupportedFileTypeError / FileTooLargeError otherwise.
    """
    safe_name = sanitize_filename(file.filename or "")
    extension = Path(safe_name).suffix.lower()

    if extension not in allowed_extensions:
        raise UnsupportedFileTypeError(
            f"File extension '{extension}' is not supported. Allowed: {', '.join(sorted(allowed_extensions))}."
        )

    if file.content_type and file.content_type not in allowed_mime_types:
        raise UnsupportedFileTypeError(
            f"File content type '{file.content_type}' is not supported."
        )

    contents = await file.read()

    if len(contents) == 0:
        raise UnsupportedFileTypeError("The uploaded file is empty.")

    if len(contents) > settings.max_file_size_bytes:
        raise FileTooLargeError(
            f"File exceeds the {settings.MAX_FILE_SIZE_MB} MB limit."
        )

    return contents
