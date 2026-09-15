# iLovePDF Clone — Module 1

A minimal PDF utility web app supporting Word → PDF and PDF → Word conversion.

## Docs

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system design, service breakdown, concurrency/timeout policy
- [`APPLICATION_FLOW.md`](./APPLICATION_FLOW.md) — user flows, API contracts, error codes
- [`REQUIREMENTS.md`](./REQUIREMENTS.md) — functional/non-functional requirements, Definition of Done

## Stack

- **Frontend:** React + TypeScript
- **Backend:** FastAPI (Python)
- **Word → PDF:** LibreOffice (headless), single-concurrency queue
- **PDF → Word:** PyMuPDF (text extraction) + python-docx (generation)
- **Merge / Split PDF:** PyMuPDF (page-level operations) + stdlib `zipfile` for Split's archive
- **Compress PDF:** PyMuPDF structural PDF optimization
- **Organize PDF:** PyMuPDF page-level operations


## Known limitations

- PDF → Word only supports **text-based PDFs**. Scanned/image-only PDFs return a `NO_TEXT_LAYER` error — OCR is a future module.
- PDF → Word does **not** preserve tables, multi-column layout, images, or most font/style fidelity — text content only.
- PDF compression currently performs structural optimization and does not resample embedded images. Some PDFs may therefore show little or no size reduction.
- Organize PDF uses a page specification supplied by the frontend and requires at least one page in the final document.
- No authentication, accounts, history, or billing.
- Word → PDF conversions are serialized server-side (one at a time) to avoid LibreOffice profile-lock issues. Merge, Split, Compress, and Organize do not require the LibreOffice queue.
- Uploaded files are stored temporarily in request-scoped workspaces and cleaned after processing.

## Environment variables

```env
MAX_FILE_SIZE_MB=25
CONVERSION_TIMEOUT_SECONDS=60
MIN_FILES_FOR_MERGE=2
DEFAULT_COMPRESSION_LEVEL=recommended
```

## Getting started

```bash
# clone and enter the repo
git clone <repo-url>
cd ilovepdf-clone

# start everything (frontend + backend) via Docker
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

### Local development (without Docker)

**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## API

```http
POST /api/v1/convert/word-to-pdf
POST /api/v1/convert/pdf-to-word
POST /api/v1/pdf/merge
POST /api/v1/pdf/split
POST /api/v1/pdf/compress
POST /api/v1/pdf/organize/info
POST /api/v1/pdf/organize
```

See `APPLICATION_FLOW.md` for full request/response shapes and the complete error code table.

## Testing

```bash
# backend
cd backend && pytest

# frontend
cd frontend && npm test
```

## Project structure

```text
.
├── backend/
│   └── app/           # FastAPI app (see ARCHITECTURE.md)
├── frontend/
│   └── src/            # React app (see ARCHITECTURE.md)
├── ARCHITECTURE.md
├── APPLICATION_FLOW.md
├── REQUIREMENTS.md
└── README.md
```
