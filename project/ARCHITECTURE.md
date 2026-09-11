# iLovePDF Clone — Architecture

## 1. Project Overview

A web-based PDF utility platform inspired by tools such as iLovePDF, built incrementally with each PDF operation as an independent module.

**Module 1 scope:**
- Word → PDF
- PDF → Word

Future modules are added only after Module 1 is stable.

---

## 2. Architecture Style

Modular monolithic architecture.

```text
Frontend
   |
   | HTTP / REST API
   |
Backend
   |
   +---- Word → PDF Service
   |
   +---- PDF → Word Service
   |
   +---- File Service
   |
   +---- Validation / Cleanup
   |
External conversion tools
```

A monolithic backend is preferred initially — it reduces infrastructure complexity and simplifies development and debugging. The system can later be split into worker services once conversion workload justifies it (see Section 12).

---

## 3. High-Level Architecture

```text
                    ┌─────────────────────┐
                    │       Browser       │
                    │ React + TypeScript  │
                    └──────────┬──────────┘
                               │
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │       FastAPI       │
                    │      REST API       │
                    └──────────┬──────────┘
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
                 ▼             ▼             ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │ Word → PDF   │ │ PDF → Word   │ │ File Service │
        │   Service    │ │   Service    │ │              │
        └──────┬───────┘ └──────┬───────┘ └──────────────┘
               │                │
               ▼                ▼
        ┌──────────────┐ ┌──────────────┐
        │  LibreOffice │ │   PyMuPDF    │
        │   (pooled)   │ │ python-docx  │
        └──────────────┘ └──────────────┘
```

---

## 4. Frontend Architecture

```text
frontend/
│
├── src/
│   ├── components/
│   │   ├── FileUploader.tsx
│   │   ├── UploadProgress.tsx
│   │   └── DownloadButton.tsx
│   │
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── WordToPdf.tsx
│   │   └── PdfToWord.tsx
│   │
│   ├── services/
│   │   └── api.ts
│   │
│   ├── types/
│   │   └── conversion.ts
│   │
│   └── App.tsx
│
└── package.json
```

### Frontend responsibilities
- File selection, drag and drop
- Client-side file validation (extension, size)
- Uploading with progress display
- Conversion status polling/handling
- Error display
- Download of result

The frontend must never perform document conversion itself.

---

## 5. Backend Architecture

```text
app/
│
├── main.py
│
├── api/
│   └── routes/
│       ├── word_to_pdf.py
│       └── pdf_to_word.py
│
├── services/
│   ├── word_to_pdf.py
│   ├── pdf_to_word.py
│   └── file_service.py
│
├── schemas/
│   └── conversion.py
│
├── core/
│   ├── config.py
│   └── libreoffice_pool.py
│
└── utils/
    ├── file_validation.py
    └── cleanup.py
```

### API Layer
- Receives HTTP requests
- Validates request parameters
- Calls services
- Returns responses

### Service Layer
- Document conversion
- File processing
- Conversion-specific logic

### Utility Layer
- File validation
- Temporary directory management
- Cleanup
- Common helpers

---

## 6. Word → PDF

```text
DOC/DOCX
   |
   ▼
File validation
   |
   ▼
Request-scoped temp workspace (UUID dir)
   |
   ▼
LibreOffice headless (via pool, bounded timeout)
   |
   ▼
PDF
   |
   ▼
Download response
   |
   ▼
Temporary files deleted
```

LibreOffice is the initial conversion engine.

### 6.1 LibreOffice concurrency

LibreOffice headless does not handle concurrent invocations safely on a shared profile — parallel requests will hit profile lock conflicts. Module 1 must implement one of:

- A small fixed-size pool of `soffice` worker processes, each with its own `--env:UserInstallation=<unique-path>`, with requests queued when the pool is saturated, **or**
- A single-concurrency job queue in front of LibreOffice (simplest for v1).

Recommendation for Module 1: single-concurrency in-process queue (e.g. an `asyncio.Semaphore(1)` guarding the conversion call). Move to a real pool only if throughput requires it.

### 6.2 Timeout policy

Every LibreOffice invocation must run under a hard timeout (default **60 seconds**, configurable via `CONVERSION_TIMEOUT_SECONDS`). On timeout: kill the process, clean up the workspace, and return `CONVERSION_TIMEOUT`.

---

## 7. PDF → Word

Targets text-based PDFs only for the first implementation.

```text
PDF
 |
 ▼
File validation
 |
 ▼
PyMuPDF text extraction
 |
 ▼
Text-layer check
 |
 ├── No extractable text → NO_TEXT_LAYER error
 |
 └── Text found
        |
        ▼
   python-docx generation
        |
        ▼
      DOCX
        |
        ▼
  Download response
        |
        ▼
Temporary files deleted
```

Scanned PDFs requiring OCR are a later enhancement — **not silently produced as an empty document.** If a PDF has no extractable text layer, the API must return a distinct `NO_TEXT_LAYER` error (see Section 10) rather than a blank or garbled DOCX.

### 7.1 Fidelity limitation (documented, not fixed in v1)

PyMuPDF extraction + python-docx reconstruction preserves text content but **not** layout: tables, multi-column text, images, and most font/style fidelity are lost. This is a known, accepted limitation for Module 1 and must be stated in the README and surfaced in the UI (e.g. a note near the PDF → Word upload control).

---

## 8. File Lifecycle

Uploaded files are always temporary and request-scoped.

```text
Upload
  ↓
Validate
  ↓
Create UUID-named workspace directory
  ↓
Process
  ↓
Generate output
  ↓
Return output
  ↓
Delete workspace directory (input + output)
```

- Each request gets its own workspace directory (e.g. `/tmp/conversions/<uuid>/`) — never a shared temp path — to avoid collisions and races between concurrent requests' cleanup.
- Cleanup runs in a `finally` block so it executes on both success and failure paths.
- No uploaded document is stored permanently in Module 1.

---

## 9. Security Considerations

- Restrict allowed file extensions (`.doc`, `.docx`, `.pdf` only)
- Validate MIME types where possible, not just extension
- Enforce maximum file size (25 MB, see Requirements)
- Generate unique temporary filenames/directories (UUID-based)
- Never trust or reuse the original filename for storage paths
- Store temporary files outside public/static directories
- Sanitize any filename shown back to the user (e.g. in the download header)
- Delete temporary files after processing, including on failure
- Prevent path traversal in any user-supplied filename
- Apply request rate limiting when deployed publicly (see Section 10.1 for Module 1 decision)

---

## 10. Error Handling

The API returns clear, machine-readable errors for:

| Code | Meaning |
|---|---|
| `UNSUPPORTED_FILE_TYPE` | Extension/MIME not allowed |
| `FILE_TOO_LARGE` | Exceeds `MAX_FILE_SIZE_MB` |
| `CORRUPTED_DOCUMENT` | File unreadable by the conversion engine |
| `NO_TEXT_LAYER` | PDF → Word: no extractable text (likely scanned) |
| `CONVERSION_TIMEOUT` | Conversion exceeded `CONVERSION_TIMEOUT_SECONDS` |
| `CONVERSION_FAILED` | Generic conversion failure |
| `MISSING_CONVERSION_TOOL` | LibreOffice/dependency unavailable server-side |
| `INTERNAL_ERROR` | Unexpected server error |

Response shape:

```json
{
  "success": false,
  "error": {
    "code": "CONVERSION_FAILED",
    "message": "The document could not be converted."
  }
}
```

A failed conversion must never crash the backend process — all conversion calls are wrapped and isolated per request.

### 10.1 Rate limiting decision for Module 1

Rate limiting is **out of scope for the Module 1 Definition of Done**, but a basic IP-based limiter (e.g. `slowapi`) should be stubbed in `core/config.py` behind a feature flag, so it can be switched on before any public deployment without a code change.

---

## 11. Concurrency & Isolation Summary

| Concern | Module 1 approach |
|---|---|
| LibreOffice concurrency | Single-concurrency queue (semaphore) |
| Temp file collisions | UUID-named per-request workspace dirs |
| Long-running conversions | Hard timeout, default 60s |
| Crash isolation | Conversion errors caught per-request, never propagate to process crash |

---

## 12. Future Architecture

When processing volume increases, conversion moves to background workers.

```text
Frontend
   |
   ▼
FastAPI
   |
   ▼
Redis / Queue
   |
   ▼
Worker
   |
   ├── LibreOffice (pooled)
   ├── PyMuPDF
   └── OCR
   |
   ▼
Object Storage
   |
   ▼
Frontend Download
```

Possible future technologies: Redis, Celery, PostgreSQL, S3/Cloudflare R2, OCR, authentication, subscription/billing. These are introduced only when actually required — not preemptively.
