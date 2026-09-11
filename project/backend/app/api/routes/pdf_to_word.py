from fastapi import APIRouter, File, Response, UploadFile

from app.core.config import settings
from app.services.file_service import save_upload
from app.services.pdf_to_word import convert_pdf_to_word
from app.utils.cleanup import request_workspace
from app.utils.file_validation import validate_upload

router = APIRouter()

DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


@router.post("/convert/pdf-to-word")
async def pdf_to_word(file: UploadFile = File(...)):
    contents = await validate_upload(
        file,
        allowed_extensions=settings.ALLOWED_PDF_EXTENSIONS,
        allowed_mime_types=settings.ALLOWED_PDF_MIME_TYPES,
    )

    with request_workspace() as workspace:
        input_path = save_upload(contents, workspace, file.filename)
        output_path = convert_pdf_to_word(input_path, workspace)
        docx_bytes = output_path.read_bytes()

    return Response(
        content=docx_bytes,
        media_type=DOCX_MIME_TYPE,
        headers={"Content-Disposition": f'attachment; filename="{output_path.name}"'},
    )
