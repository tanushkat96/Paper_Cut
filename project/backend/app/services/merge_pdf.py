from pathlib import Path

import fitz  # PyMuPDF

from app.schemas.errors import ConversionFailedError, CorruptedDocumentError


def merge_pdfs(input_paths: list[Path], workspace: Path) -> Path:
    """
    Merges the given PDFs, in the exact order supplied, into a single PDF
    saved inside the request workspace. Page order, content, dimensions,
    and rotation are preserved because pages are inserted directly via
    PyMuPDF rather than re-rendered.

    Raises CorruptedDocumentError if any input PDF cannot be opened, and
    ConversionFailedError if the merged result cannot be written.
    """
    output_doc = fitz.open()

    try:
        for input_path in input_paths:
            try:
                src_doc = fitz.open(input_path)
            except Exception as exc:
                raise CorruptedDocumentError(f"'{input_path.name}' could not be opened: {exc}")

            try:
                if src_doc.page_count == 0:
                    raise CorruptedDocumentError(f"'{input_path.name}' has no pages.")
                output_doc.insert_pdf(src_doc)
            finally:
                src_doc.close()

        output_path = workspace / "merged.pdf"
        try:
            output_doc.save(output_path)
        except Exception as exc:
            raise ConversionFailedError(f"Failed to save the merged PDF: {exc}")
    finally:
        output_doc.close()

    return output_path
