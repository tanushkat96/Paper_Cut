import asyncio
import os
import shutil
import subprocess
from pathlib import Path

from app.core.config import settings
from app.core.libreoffice_pool import get_libreoffice_lock
from app.schemas.errors import (
    ConversionFailedError,
    ConversionTimeoutError,
    CorruptedDocumentError,
    MissingConversionToolError,
)


def _find_libreoffice_binary() -> str:
    candidates = [
        shutil.which("soffice"),
        shutil.which("soffice.exe"),
        str(Path("C:/Program Files/LibreOffice/program/soffice.exe")),
        str(Path("C:/Program Files (x86)/LibreOffice/program/soffice.exe")),
    ]

    for candidate in candidates:
        if not candidate:
            continue
        if os.path.exists(candidate):
            return candidate

    raise MissingConversionToolError("LibreOffice (soffice) is not available on this server.")


def _check_libreoffice_available() -> str:
    return _find_libreoffice_binary()


def _get_libreoffice_profile_uri(workspace: Path) -> str:
    profile_dir = (workspace / ".libreoffice-profile").resolve()
    return profile_dir.as_uri()


def _build_libreoffice_command(soffice_binary: str, input_path: Path, workspace: Path) -> list[str]:
    cmd = [
        soffice_binary,
        "--headless",
        "--norestore",
    ]

    if os.name != "nt":
        cmd.append(f"--env:UserInstallation={_get_libreoffice_profile_uri(workspace)}")

    cmd.extend([
        "--convert-to",
        "pdf",
        "--outdir",
        str(workspace),
        str(input_path),
    ])
    return cmd


import subprocess


async def convert_word_to_pdf(input_path: Path, workspace: Path) -> Path:
    """
    Converts a .doc/.docx file to PDF using headless LibreOffice.
    """

    soffice_binary = _check_libreoffice_available()

    input_path = input_path.resolve()
    workspace = workspace.resolve()

    if not input_path.exists():
        raise ConversionFailedError(
            f"Input file does not exist: {input_path}"
        )

    workspace.mkdir(parents=True, exist_ok=True)

    lock = get_libreoffice_lock()

    async with lock:
        cmd = _build_libreoffice_command(
            soffice_binary,
            input_path,
            workspace,
        )

        try:
            result = await asyncio.to_thread(
                subprocess.run,
                cmd,
                capture_output=True,
                text=True,
                timeout=settings.CONVERSION_TIMEOUT_SECONDS,
            )

        except subprocess.TimeoutExpired:
            raise ConversionTimeoutError(
                f"Conversion exceeded "
                f"{settings.CONVERSION_TIMEOUT_SECONDS} seconds."
            )

        except FileNotFoundError:
            raise MissingConversionToolError(
                "LibreOffice (soffice) executable not found."
            )

        if result.returncode != 0:
            error_message = (
                result.stderr.strip()
                or result.stdout.strip()
                or "Unknown LibreOffice error."
            )

            raise ConversionFailedError(
                f"LibreOffice conversion failed: {error_message[:500]}"
            )

    output_path = workspace / f"{input_path.stem}.pdf"

    if not output_path.exists():
        raise CorruptedDocumentError(
            "The document could not be converted — "
            "it may be corrupted."
        )

    return output_path