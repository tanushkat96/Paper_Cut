from pathlib import Path

import fitz  # PyMuPDF
from docx import Document

from app.schemas.errors import ConversionFailedError, CorruptedDocumentError, NoTextLayerError


def convert_pdf_to_word(input_path: Path, workspace: Path) -> Path:
    """
    Extracts text from a text-based PDF via PyMuPDF and writes it into a DOCX
    via python-docx. Does NOT preserve tables, columns, images, or most
    formatting fidelity — see ARCHITECTURE.md, Section 7.1.
    """
    try:
        pdf = fitz.open(input_path)
    except Exception as exc:
        raise CorruptedDocumentError(f"The PDF could not be opened: {exc}")

    try:
        pages_text = [page.get_text("text") for page in pdf]
    finally:
        pdf.close()

    if not any(text.strip() for text in pages_text):
        raise NoTextLayerError(
            "This PDF has no extractable text layer (it may be scanned). "
            "OCR support is planned for a future release."
        )

    try:
        document = Document()
        for i, page_text in enumerate(pages_text):
            if i > 0:
                document.add_page_break()
            for line in page_text.split("\n"):
                document.add_paragraph(line)

        output_path = workspace / (input_path.stem + ".docx")
        document.save(output_path)
    except Exception as exc:
        raise ConversionFailedError(f"Failed to generate DOCX: {exc}")

    return output_path
