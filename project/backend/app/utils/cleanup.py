import shutil
import uuid
from contextlib import contextmanager
from pathlib import Path

from app.core.config import settings


@contextmanager
def request_workspace():
    """
    Creates a UUID-named temp directory for a single request, and guarantees
    it is deleted afterwards — on both success and failure paths.
    See ARCHITECTURE.md, Section 8.
    """
    workspace = settings.TEMP_ROOT / str(uuid.uuid4())
    workspace.mkdir(parents=True, exist_ok=False)
    try:
        yield workspace
    finally:
        shutil.rmtree(workspace, ignore_errors=True)


def unique_path(workspace: Path, filename: str) -> Path:
    return workspace / filename
