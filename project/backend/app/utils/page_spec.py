import json

from app.schemas.errors import InvalidPageSpecError


def parse_page_spec(raw: str, page_count: int) -> list[dict]:
    """
    Parse and validate the JSON page specification.

    Expected format:
        [
            {"page": 0, "rotation": 0},
            {"page": 2, "rotation": 90},
            {"page": 1, "rotation": 270}
        ]

    page is zero-based.
    """

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise InvalidPageSpecError(
            "The page specification must be valid JSON."
        ) from exc

    if not isinstance(parsed, list):
        raise InvalidPageSpecError(
            "The page specification must be a JSON array."
        )

    if not parsed:
        raise InvalidPageSpecError(
            "At least one page must remain in the document."
        )

    normalized: list[dict] = []

    for index, item in enumerate(parsed):
        if not isinstance(item, dict):
            raise InvalidPageSpecError(
                f"Page entry {index + 1} must be an object."
            )

        if "page" not in item:
            raise InvalidPageSpecError(
                f"Page entry {index + 1} is missing 'page'."
            )

        page = item["page"]
        rotation = item.get("rotation", 0)

        if not isinstance(page, int):
            raise InvalidPageSpecError(
                f"Page entry {index + 1} has an invalid page number."
            )

        if page < 0 or page >= page_count:
            raise InvalidPageSpecError(
                f"Page number {page + 1} is outside the document."
            )

        if not isinstance(rotation, int):
            raise InvalidPageSpecError(
                f"Page entry {index + 1} has an invalid rotation."
            )

        rotation %= 360

        if rotation not in {0, 90, 180, 270}:
            raise InvalidPageSpecError(
                f"Page entry {index + 1} rotation must be "
                "0, 90, 180, or 270 degrees."
            )

        normalized.append(
            {
                "page": page,
                "rotation": rotation,
            }
        )

    return normalized