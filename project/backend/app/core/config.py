import os
import tempfile
from pathlib import Path


class Settings:
    """Central app configuration, driven by environment variables."""

    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "25"))
    CONVERSION_TIMEOUT_SECONDS: int = int(os.getenv("CONVERSION_TIMEOUT_SECONDS", "60"))
    MIN_FILES_FOR_MERGE: int = int(os.getenv("MIN_FILES_FOR_MERGE", "2"))

    TEMP_ROOT: Path = Path(os.getenv("TEMP_ROOT", str(Path(tempfile.gettempdir()) / "ilovepdf-clone")))

    ALLOWED_WORD_EXTENSIONS = {".doc", ".docx"}
    ALLOWED_PDF_EXTENSIONS = {".pdf"}

    ALLOWED_WORD_MIME_TYPES = {
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    ALLOWED_PDF_MIME_TYPES = {"application/pdf"}

    # Rate limiting is stubbed but OFF by default for Module 1 (see REQUIREMENTS.md, Section 7).
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "false").lower() == "true"

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024


settings = Settings()
settings.TEMP_ROOT.mkdir(parents=True, exist_ok=True)
