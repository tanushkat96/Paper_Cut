# iLovePDF Clone — Architecture

## 1. Project Overview

A web-based PDF utility platform inspired by tools such as iLovePDF, built incrementally with each PDF operation as an independent module.

**Module 1 scope (implemented):**

- Word → PDF
- PDF → Word

**Module 2 scope (implemented):**

- Merge PDF
- Split PDF

**Module 3 scope (implemented):**

- Compress PDF
- Organize PDF

The project currently includes all three modules and uses a **modular monolithic architecture** initially. New modules are added incrementally without introducing unnecessary infrastructure complexity.

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
   +---- Merge PDF Service
   |
   +---- Split PDF Service
   |
   +---- Compress PDF Service
   |
   +---- Organize PDF Service
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
                    ┌──────────────────────┐
                    │      Frontend        │
                    │ React + TypeScript   │
                    │       + Vite         │
                    └──────────┬───────────┘
                               │
                          HTTP / REST
                               │
                    ┌──────────▼───────────┐
                    │     FastAPI Backend  │
                    └──────────┬───────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   Conversion Services    PDF Services        Common Services
          │                    │                    │
    ┌─────┴─────┐       ┌──────┼──────────┐    ┌────┴─────────┐
    │           │       │      │          │    │              │
 Word → PDF  PDF → Word Merge  Split   Compress Organize  Validation
    │           │       │      │          │       │            │
 LibreOffice PyMuPDF   PyMuPDF + zipfile  PyMuPDF       File/Cleanup
    │           │       │      │          │       │            │
    └───────────┴───────┴──────┴──────────┴───────┴────────────┘
                               │
                         Generated File
                               │
                        Download Response
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
│   │   ├── DownloadButton.tsx
│   │   ├── FileListEditor.tsx
│   │   ├── PageListEditor.tsx
│   │   └── ConversionPage.tsx
│   │
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── WordToPdf.tsx
│   │   ├── PdfToWord.tsx
│   │   ├── MergePdf.tsx
│   │   ├── SplitPdf.tsx
│   │   ├── CompressPdf.tsx
│   │   └── OrganizePdf.tsx
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
- Processing state handling
- Compression-level selection
- Display of compression statistics
- PDF page organization controls
- Page selection
- Drag-and-drop page reordering
- Page removal
- Page rotation
- Center-page preview
- Error display
- Download of result

The frontend must never perform document conversion or PDF processing itself.

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
│       ├── pdf_to_word.py
│       ├── merge_pdf.py
│       ├── split_pdf.py
│       ├── compress_pdf.py
│       └── organize_pdf.py
│
├── services/
│   ├── word_to_pdf.py
│   ├── pdf_to_word.py
│   ├── merge_pdf.py
│   ├── split_pdf.py
│   ├── compress_pdf.py
│   ├── organize_pdf.py
│   └── file_service.py
│
├── schemas/
│   ├── conversion.py
│   ├── errors.py
│   └── __init__.py
│
├── core/
│   ├── config.py
│   └── libreoffice_pool.py
│
└── utils/
    ├── cleanup.py
    ├── file_validation.py
    ├── page_ranges.py
    ├── page_spec.py
    └── __init__.py
```

### API Layer

- Receives HTTP requests
- Validates request parameters
- Validates uploaded files
- Calls services
- Returns responses

### Service Layer

- Document conversion
- File processing
- Conversion-specific logic

### Utility Layer

- File validation
- Temporary directory management
- Validates uploaded files
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

Scanned PDFs requiring OCR are a later enhancement — **not silently produced as an empty document.** If a PDF has no extractable text layer, the API must return a distinct `NO_TEXT_LAYER` error (see the error table in Section 14) rather than a blank or garbled DOCX.

### 7.1 Fidelity limitation (documented, not fixed in v1)

PyMuPDF extraction + python-docx reconstruction preserves text content but **not** layout: tables, multi-column text, images, and most font/style fidelity are lost. This is a known, accepted limitation for Module 1 and must be stated in the README and surfaced in the UI (e.g. a note near the PDF → Word upload control).

---

## 8. Merge PDF

Merges two or more PDF files into a single PDF while preserving the order selected by the user.

```text
Multiple PDFs
     |
     ▼
File validation
     |
     ▼
Request-scoped temp workspace
     |
     ▼
PyMuPDF insert_pdf()
     |
     ▼
merged.pdf
     |
     ▼
Download response
     |
     ▼
Temporary files deleted
```

---

## 9. Split PDF

Splits a PDF into multiple PDF files. The initial implementation supports splitting every page and custom page ranges.

````text
PDF
 |
 ▼
File validation
 |
 ▼
Request-scoped temp workspace
 |
 ▼
PyMuPDF
 |
 ├── Every page
 │      ├── page-1.pdf
 │      ├── page-2.pdf
 │      └── ...
 │
 └── Custom ranges
        ├── pages-1-3.pdf
        ├── page-5.pdf
        └── ...
 |
 ▼
ZIP archive
 |
 ▼
Download response
 |
 ▼
Temporary files deleted

---

## 10. Compress PDF
Compresses a PDF using PyMuPDF optimization.

PDF
 |
 ▼
File validation
 |
 ▼
Request-scoped UUID workspace
 |
 ▼
Compression level selection
 |
 ├── low
 ├── recommended
 └── extreme
 |
 ▼
PyMuPDF PDF optimization
 |
 ▼
compressed.pdf
 |
 ▼
Calculate:
- Original size
- Compressed size
- Reduction percentage
 |
 ▼
Download response
 |
 ▼
Temporary files deleted

### 10.1 Compression levels

The backend supports three levels:

Level	Purpose
low	Lighter PDF optimization
recommended	Default balanced optimization
extreme	Stronger PDF optimization

The default level is controlled by:

`DEFAULT_COMPRESSION_LEVEL=recommended`

### 10.2 Compression response metadata
The compression endpoint returns the generated PDF and exposes:

- X-Original-Size
- X-Compressed-Size
- X-Reduction-Percent

The percentage represents the calculated size reduction.

Compression is optimization-based and does not guarantee that every PDF will become smaller. A PDF that is already optimized may show little or no reduction.

## 11. Organize PDF

Organizes PDF pages by allowing the user to select, reorder, remove, and rotate pages before generating the final document.

### 11.1 User Interface

The Organize PDF interface is divided into two main areas:

```text
┌──────────────────────┬─────────────────────────────────────┐
│                      │                                     │
│      Page List       │          Center PDF Preview         │
│                      │                                     │
│  ⋮⋮  Page 1           │                                     │
│  ⋮⋮  Page 2           │             ┌───────────┐           │
│  ⋮⋮  Page 3           │             │           │           │
│  ⋮⋮  Page 4           │             │   PDF     │           │
│                      │             │   Page    │           │
│                      │             │           │           │
│                      │             └───────────┘           │
│                      │                                     │
│                      │           Rotate      Remove        │
└──────────────────────┴─────────────────────────────────────┘
Page List

The left sidebar contains a simple list of pages:

Page numbers are displayed without thumbnails
Pages can be selected by clicking them
Pages can be reordered using drag and drop
The currently selected page is visually highlighted

The sidebar does not perform PDF processing. It only maintains the page ordering and selection state.

Center Preview

The center area displays a preview of the currently selected PDF page.

The preview is generated on the frontend using PDF.js.

The selected page's rotation is applied to the preview so that the user can see the current orientation.

Page Actions

The center viewer provides actions for the selected page:

Rotate — rotates the selected page by 90 degrees
Remove — removes the selected page from the output
Page navigation can be used to move between pages
### 11.1 Page specification

The backend accepts a page specification containing:

[
  {"page": 2, "rotation": 0},
  {"page": 0, "rotation": 90},
  {"page": 1, "rotation": 0}
]
page uses a zero-based index internally.
The order of entries determines the output order.
A page omitted from the specification is not included in the output.
rotation must be 0, 90, 180, or 270.
Invalid page specifications return INVALID_PAGE_SPEC.

### 11.2 Organize information endpoint

Before organization, the frontend can request the PDF page count through:

POST /api/v1/pdf/organize/info

This allows the frontend to build the page organization interface using the actual number of pages in the uploaded document.

### 11.3 Organize response metadata

The organize flow returns a download response with a generated PDF file and does not provide any extra header metadata beyond the standard attachment filename.

## 12. File Lifecycle

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
````

- Each request gets its own workspace directory (e.g. `/tmp/conversions/<uuid>/`) — never a shared temp path — to avoid collisions and races between concurrent requests' cleanup.
- Cleanup runs in a `finally` block so it executes on both success and failure paths.
- No uploaded document is stored permanently in the application.

---

## 13. Security Considerations

- Restrict allowed file extensions (`.doc`, `.docx`, `.pdf` only)
- Validate MIME types where possible, not just extension
- Enforce maximum file size (25 MB, see Requirements)
- Generate unique temporary filenames/directories (UUID-based)
- Never trust or reuse the original filename for storage paths
- Store temporary files outside public/static directories
- Sanitize any filename shown back to the user (e.g. in the download header)
- Delete temporary files after processing, including on failure
- Prevent path traversal in any user-supplied filename
- Apply request rate limiting when deployed publicly, especially when the service is exposed to external users

---

## 14. Error Handling

The API returns clear, machine-readable errors for:

| Code                        | Meaning                                          |
| --------------------------- | ------------------------------------------------ |
| `UNSUPPORTED_FILE_TYPE`     | Extension/MIME not allowed                       |
| `FILE_TOO_LARGE`            | Exceeds `MAX_FILE_SIZE_MB`                       |
| `CORRUPTED_DOCUMENT`        | File unreadable by the conversion engine         |
| `NO_TEXT_LAYER`             | PDF → Word: no extractable text (likely scanned) |
| `CONVERSION_TIMEOUT`        | Conversion exceeded `CONVERSION_TIMEOUT_SECONDS` |
| `CONVERSION_FAILED`         | Generic conversion failure                       |
| `MISSING_CONVERSION_TOOL`   | LibreOffice/dependency unavailable server-side   |
| `TOO_FEW_FILES`             | Merge PDF: fewer than 2 files supplied           |
| `INVALID_PAGE_RANGE`        | Split PDF: malformed or out-of-bounds page range |
| `ZIP_CREATION_FAILED`       | Split PDF: failed to create output archive       |
| `INVALID_COMPRESSION_LEVEL` | Compression level is not low/recommended/extreme |
| `EMPTY_DOCUMENT`            | PDF contains zero pages                          |
| `INVALID_PAGE_SPEC`         | Organize PDF page specification is invalid       |
| `INTERNAL_ERROR`            | Unexpected server error                          |

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

## 15. Concurrency & Isolation Summary

| Concern                  | Current approach                                                       |
| ------------------------ | ---------------------------------------------------------------------- |
| LibreOffice concurrency  | Single-concurrency queue (semaphore)                                   |
| Temp file collisions     | UUID-named per-request workspace dirs                                  |
| Long-running conversions | Hard timeout, default 60s                                              |
| Crash isolation          | Conversion errors caught per-request, never propagate to process crash |
| Merge PDF concurrency    | Request-scoped workspace; PyMuPDF processing                           |
| Split PDF concurrency    | Request-scoped workspace; PyMuPDF + ZIP processing                     |
| Compress PDF             | Request-scoped workspace + PyMuPDF                                     |
| Organize PDF             | Request-scoped workspace + PyMuPDF                                     |

---

## 16. Future Architecture

When processing volume increases, PDF processing and conversion can move to background workers.

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
   ├── Merge PDF
   ├── Split PDF
   ├── Compress PDF
   ├── Organize PDF
   └── OCR
   |
   ▼
Object Storage
   |
   ▼
Frontend Download
```

Possible future technologies: Redis, Celery, PostgreSQL, S3/Cloudflare R2, OCR, authentication, subscription/billing. These are introduced only when actually required — not preemptively.
