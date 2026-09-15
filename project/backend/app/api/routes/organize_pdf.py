from fastapi import APIRouter, File, Form, Response, UploadFile

from app.core.config import settings
from app.services.file_service import save_upload
from app.services.organize_pdf import get_page_count, organize_pdf
from app.utils.cleanup import request_workspace
from app.utils.file_validation import validate_upload
from app.utils.page_spec import parse_page_spec


router = APIRouter()


@router.post("/pdf/organize/info")
async def organize_info(file: UploadFile = File(...)):
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

        page_count = get_page_count(input_path)

    return {
        "success": True,
        "page_count": page_count,
    }


@router.post("/pdf/organize")
async def organize_pdf_route(
    file: UploadFile = File(...),
    pages: str = Form(...),
):
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

        page_count = get_page_count(input_path)
        page_spec = parse_page_spec(pages, page_count)

        output_path = organize_pdf(
            input_path,
            workspace,
            page_spec,
        )

        organized_bytes = output_path.read_bytes()

    return Response(
        content=organized_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="organized.pdf"',
        },
    )