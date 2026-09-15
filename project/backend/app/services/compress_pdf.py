from pathlib import Path

import fitz  # PyMuPDF

from app.schemas.errors import (
    ConversionFailedError,
    CorruptedDocumentError,
    InvalidCompressionLevelError,
)


_COMPRESSION_OPTIONS = {
    "low": {
        "garbage": 2,
        "deflate": True,
        "clean": True,
    },
    "recommended": {
        "garbage": 3,
        "deflate": True,
        "clean": True,
    },
    "extreme": {
        "garbage": 4,
        "deflate": True,
        "clean": True,
    },
}


def compress_pdf(
    input_path: Path,
    workspace: Path,
    level: str,
) -> tuple[Path, int, int]:
    """
    Structurally compress a PDF without rasterizing pages or resampling images.

    Returns:
        (output_path, original_size_bytes, compressed_size_bytes)
    """
    options = _COMPRESSION_OPTIONS.get(level)

    if options is None:
        raise InvalidCompressionLevelError(
            f"Unsupported compression level '{level}'. "
            "Choose low, recommended, or extreme."
        )

    before_size = input_path.stat().st_size

    try:
        source = fitz.open(input_path)
    except Exception as exc:
        raise CorruptedDocumentError(
            f"'{input_path.name}' could not be opened: {exc}"
        ) from exc

    try:
        if source.page_count == 0:
            raise CorruptedDocumentError(
                f"'{input_path.name}' has no pages."
            )

        output_path = workspace / "compressed.pdf"

        try:
            source.save(output_path, **options)
        except Exception as exc:
            raise ConversionFailedError(
                f"Failed to save the compressed PDF: {exc}"
            ) from exc

    finally:
        source.close()

    after_size = output_path.stat().st_size

    return output_path, before_size, after_size