from fastapi import APIRouter, File, Response, UploadFile

from app.core.config import settings
from app.services.file_service import save_upload
from app.services.word_to_pdf import convert_word_to_pdf
from app.utils.cleanup import request_workspace
from app.utils.file_validation import validate_upload

router = APIRouter()


@router.post("/convert/word-to-pdf")
async def word_to_pdf(file: UploadFile = File(...)):
    contents = await validate_upload(
        file,
        allowed_extensions=settings.ALLOWED_WORD_EXTENSIONS,
        allowed_mime_types=settings.ALLOWED_WORD_MIME_TYPES,
    )

    with request_workspace() as workspace:
        input_path = save_upload(contents, workspace, file.filename)
        output_path = await convert_word_to_pdf(input_path, workspace)

        # Read into memory before the workspace is cleaned up on context exit.
        pdf_bytes = output_path.read_bytes()

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{output_path.name}"'},
    )
