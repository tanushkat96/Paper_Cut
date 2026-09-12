import re

from app.schemas.errors import InvalidPageRangeError

_RANGE_TOKEN_RE = re.compile(r"^\s*(\d+)\s*(?:-\s*(\d+))?\s*$")


def parse_page_ranges(page_ranges: str, page_count: int) -> list[tuple[int, int]]:
    """
    Parses a page-range string such as "1-3,5,7-9" into a list of inclusive
    (start, end) tuples, 1-indexed, in the exact order requested.

    Validates:
      - each token is an integer or integer-integer range
      - values are >= 1 and <= page_count
      - a range's start <= end
      - malformed tokens are rejected outright (no silent skipping)

    Output order matches the order the ranges were requested in — overlapping
    or duplicate ranges are preserved as separate output files rather than
    merged, so "1-2,1-2" produces two identical output PDFs.
    """
    if not page_ranges or not page_ranges.strip():
        raise InvalidPageRangeError("page_ranges was provided but empty.")

    ranges: list[tuple[int, int]] = []

    for raw_token in page_ranges.split(","):
        token = raw_token.strip()
        if not token:
            raise InvalidPageRangeError(f"Malformed page range near an empty segment in '{page_ranges}'.")

        match = _RANGE_TOKEN_RE.match(token)
        if not match:
            raise InvalidPageRangeError(f"Malformed page range segment: '{token}'.")

        start_str, end_str = match.group(1), match.group(2)
        start = int(start_str)
        end = int(end_str) if end_str is not None else start

        if start < 1 or end < 1:
            raise InvalidPageRangeError(f"Page numbers must be 1 or greater: '{token}'.")

        if start > page_count or end > page_count:
            raise InvalidPageRangeError(
                f"Page range '{token}' exceeds the document's page count ({page_count})."
            )

        if start > end:
            raise InvalidPageRangeError(f"Range start must be <= end: '{token}'.")

        ranges.append((start, end))

    return ranges
