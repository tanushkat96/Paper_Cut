from fastapi import APIRouter, File, Response, UploadFile

from app.core.config import settings
from app.schemas.errors import TooFewFilesError
from app.services.file_service import save_upload
from app.services.merge_pdf import merge_pdfs
from app.utils.cleanup import request_workspace
from app.utils.file_validation import validate_upload

router = APIRouter()


@router.post("/pdf/merge")
async def merge_pdf(files: list[UploadFile] = File(...)):
    if len(files) < settings.MIN_FILES_FOR_MERGE:
        raise TooFewFilesError(
            f"Merging requires at least {settings.MIN_FILES_FOR_MERGE} PDF files."
        )

    with request_workspace() as workspace:
        input_paths = []
        # Prefix with the request order so same-named uploads never collide
        # in the shared workspace, while preserving the order they arrived in.
        for index, upload in enumerate(files):
            contents = await validate_upload(
                upload,
                allowed_extensions=settings.ALLOWED_PDF_EXTENSIONS,
                allowed_mime_types=settings.ALLOWED_PDF_MIME_TYPES,
            )
            indexed_name = f"{index:03d}_{upload.filename}"
            input_paths.append(save_upload(contents, workspace, indexed_name))

        output_path = merge_pdfs(input_paths, workspace)
        merged_bytes = output_path.read_bytes()

    return Response(
        content=merged_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="merged.pdf"'},
    )
