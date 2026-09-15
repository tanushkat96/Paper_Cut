from fastapi import APIRouter, File, Form, Response, UploadFile

from app.core.config import settings
from app.services.compress_pdf import compress_pdf
from app.services.file_service import save_upload
from app.schemas.errors import InvalidCompressionLevelError
from app.utils.cleanup import request_workspace
from app.utils.file_validation import validate_upload
from fastapi import APIRouter, File, Form, Response, UploadFile

router = APIRouter()


@router.post("/pdf/compress")
async def compress_pdf_route(
    file: UploadFile = File(...),
    level: str = Form(settings.DEFAULT_COMPRESSION_LEVEL),
):
    level = level.strip().lower()

    if level not in {"low", "recommended", "extreme"}:
        raise InvalidCompressionLevelError(
            f"Unsupported compression level '{level}'. "
            "Choose low, recommended, or extreme."
        )

    with request_workspace() as workspace:
        contents = await validate_upload(
            file,
            allowed_extensions=settings.ALLOWED_PDF_EXTENSIONS,
            allowed_mime_types=settings.ALLOWED_PDF_MIME_TYPES,
        )

        input_path = save_upload(
            contents,
            workspace,
            file.filename or "input.pdf",
        )

        output_path, before_size, after_size = compress_pdf(
            input_path,
            workspace,
            level,
        )

        compressed_bytes = output_path.read_bytes()

    reduction_percent = 0.0
    if before_size > 0:
        reduction_percent = max(
            0.0,
            ((before_size - after_size) / before_size) * 100,
        )

    return Response(
        content=compressed_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="compressed.pdf"',
            "X-Original-Size": str(before_size),
            "X-Compressed-Size": str(after_size),
            "X-Reduction-Percent": f"{reduction_percent:.2f}",
        },
    )