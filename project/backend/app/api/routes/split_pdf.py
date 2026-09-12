from typing import Optional

from fastapi import APIRouter, File, Form, Response, UploadFile

from app.core.config import settings
from app.services.file_service import save_upload
from app.services.split_pdf import split_pdf
from app.utils.cleanup import request_workspace
from app.utils.file_validation import validate_upload

router = APIRouter()


@router.post("/pdf/split")
async def split_pdf_route(file: UploadFile = File(...), page_ranges: Optional[str] = Form(None)):
    contents = await validate_upload(
        file,
        allowed_extensions=settings.ALLOWED_PDF_EXTENSIONS,
        allowed_mime_types=settings.ALLOWED_PDF_MIME_TYPES,
    )

    with request_workspace() as workspace:
        input_path = save_upload(contents, workspace, file.filename)
        zip_path = split_pdf(input_path, workspace, page_ranges)
        zip_bytes = zip_path.read_bytes()

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="split-pdf.zip"'},
    )
