from pathlib import Path

import fitz

from app.schemas.errors import (
    ConversionFailedError,
    CorruptedDocumentError,
    EmptyDocumentError,
)


def get_page_count(input_path: Path) -> int:
    """Return the number of pages in a PDF."""
    try:
        document = fitz.open(input_path)
    except Exception as exc:
        raise CorruptedDocumentError(
            f"'{input_path.name}' could not be opened: {exc}"
        ) from exc

    try:
        if document.page_count == 0:
            raise EmptyDocumentError(
                f"'{input_path.name}' has no pages."
            )

        return document.page_count
    finally:
        document.close()


def organize_pdf(
    input_path: Path,
    workspace: Path,
    pages: list[dict],
) -> Path:
    """
    Create a new PDF according to the requested page specification.

    Each page entry has:
        {
            "page": <zero-based source page index>,
            "rotation": <rotation in degrees>
        }

    The page list determines final order.
    """

    try:
        source = fitz.open(input_path)
    except Exception as exc:
        raise CorruptedDocumentError(
            f"'{input_path.name}' could not be opened: {exc}"
        ) from exc

    try:
        if source.page_count == 0:
            raise EmptyDocumentError(
                f"'{input_path.name}' has no pages."
            )

        output = fitz.open()

        try:
            for spec in pages:
                page_index = spec["page"]
                rotation = spec.get("rotation", 0)

                output.insert_pdf(
                    source,
                    from_page=page_index,
                    to_page=page_index,
                )

                new_page = output[-1]

                if rotation:
                    current_rotation = new_page.rotation
                    new_page.set_rotation(
                        (current_rotation + rotation) % 360
                    )

            if output.page_count == 0:
                raise EmptyDocumentError(
                    "The organized PDF must contain at least one page."
                )

            output_path = workspace / "organized.pdf"

            try:
                output.save(output_path)
            except Exception as exc:
                raise ConversionFailedError(
                    f"Failed to save the organized PDF: {exc}"
                ) from exc

            return output_path

        finally:
            output.close()

    finally:
        source.close()