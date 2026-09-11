import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import pdf_to_word, word_to_pdf
from app.schemas.errors import ConversionError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ilovepdf-clone")

app = FastAPI(title="iLovePDF Clone API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before any public deployment
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(word_to_pdf.router, prefix="/api/v1")
app.include_router(pdf_to_word.router, prefix="/api/v1")


@app.exception_handler(ConversionError)
async def conversion_error_handler(request: Request, exc: ConversionError):
    logger.warning("ConversionError [%s]: %s", exc.code, exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"code": exc.code, "message": exc.message}},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # A conversion failure must never crash the server (REQUIREMENTS.md, Section 6).
    logger.exception("Unhandled server error")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {"code": "INTERNAL_ERROR", "message": "Something went wrong on our end."},
        },
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
