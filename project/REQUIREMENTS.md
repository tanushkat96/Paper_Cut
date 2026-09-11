# iLovePDF Clone — Requirements

## 1. Module 1 Scope

- Word → PDF
- PDF → Word

## 2. Functional Requirements

### 2.1 Word → PDF
The system must:
- Accept `.doc` files
- Accept `.docx` files
- Reject unsupported file types (`UNSUPPORTED_FILE_TYPE`)
- Validate maximum file size (`FILE_TOO_LARGE`)
- Upload the document
- Convert the document to PDF via a single-concurrency LibreOffice queue
- Time out and fail cleanly if conversion exceeds `CONVERSION_TIMEOUT_SECONDS` (`CONVERSION_TIMEOUT`)
- Provide the generated PDF for download
- Delete temporary files after processing, including on failure

### 2.2 PDF → Word
The system must:
- Accept `.pdf` files
- Reject unsupported file types (`UNSUPPORTED_FILE_TYPE`)
- Validate maximum file size (`FILE_TOO_LARGE`)
- Extract text from text-based PDFs
- Detect PDFs with no extractable text layer and return `NO_TEXT_LAYER` rather than an empty/garbled document
- Generate a `.docx` file from extracted text
- Provide the generated DOCX for download
- Delete temporary files after processing, including on failure

**Known limitation (by design in Module 1):** table structure, multi-column layout, images, and font/style fidelity are not preserved during PDF → Word conversion. This must be stated in the UI and README.

## 3. Frontend Requirements

**Landing Page**
- Application name and description
- Word → PDF tool entry point
- PDF → Word tool entry point

**Conversion Page**
- File upload button
- Drag-and-drop support
- Supported file info (types, 25 MB max)
- Upload progress indicator
- Processing indicator
- Success state
- Download button
- Error state with the specific error message (mapped from error `code`, not a generic fallback)
- "Try Again" button that resets to `IDLE`

## 4. Backend Requirements

Endpoints:
```text
POST /api/v1/convert/word-to-pdf
POST /api/v1/convert/pdf-to-word
```

The backend must:
- Validate files (extension, MIME type, size, corruption)
- Generate unique, UUID-named temporary workspace paths per request
- Perform conversion under a bounded concurrency model (single-concurrency queue for Module 1) and a hard timeout
- Return generated files with correct `Content-Type`
- Handle conversion errors with specific, machine-readable error codes (see Application Flow doc, Section 7)
- Never crash the server process on a conversion failure
- Clean temporary files after every request, success or failure

## 5. File Requirements

**Maximum file size:** 25 MB (`MAX_FILE_SIZE_MB`, configurable)

**Conversion timeout:** 60 seconds default (`CONVERSION_TIMEOUT_SECONDS`, configurable)

**Allowed input formats:**
```text
Word → PDF:  .doc, .docx
PDF → Word:  .pdf
```

**Output formats:**
```text
Word → PDF:  .pdf
PDF → Word:  .docx
```

## 6. Non-Functional Requirements

**Performance** — Normal text documents (a few pages, no exotic formatting) should process within a few seconds under single-concurrency; the hard timeout guards against pathological inputs.

**Reliability** — A failed conversion must not crash the backend; conversion calls are isolated and wrapped per request.

**Concurrency** — LibreOffice invocations are serialized (single-concurrency queue) to avoid profile-lock conflicts in Module 1.

**Security** — Uploaded files are never exposed at a public/static path; filenames are never trusted for storage; path traversal is prevented.

**Privacy** — Files are temporary, stored in per-request UUID-named directories, and deleted immediately after the response is returned (or after failure).

**Maintainability** — Each conversion operation is a separate service module, following a common upload → validate → process → generate → download → cleanup pattern reusable by future modules.

## 7. Future Requirements (explicitly out of scope for Module 1)

- User authentication
- User accounts
- Conversion history
- Payment/subscription
- OCR (scanned PDF support)
- Batch conversion
- Cloud storage
- Merge PDF
- Split PDF
- Compress PDF
- PDF → JPG
- JPG → PDF
- Digital signatures
- Watermarking
- Public rate limiting (stubbed behind a feature flag, not enabled by default)

These are added incrementally, one module at a time, after Module 1 is stable.

## 8. Definition of Done

Module 1 is complete when:

- [ ] User can upload DOCX
- [ ] DOCX converts successfully to PDF
- [ ] User can download PDF
- [ ] User can upload PDF
- [ ] Text-based PDF converts to DOCX
- [ ] User can download DOCX
- [ ] Invalid file types are rejected with `UNSUPPORTED_FILE_TYPE`
- [ ] Oversized files are rejected with `FILE_TOO_LARGE`
- [ ] Scanned/no-text PDFs are rejected with `NO_TEXT_LAYER` (not silently converted)
- [ ] Conversion timeouts return `CONVERSION_TIMEOUT` and do not hang the request
- [ ] Conversion failures are handled and return `CONVERSION_FAILED` without crashing the server
- [ ] Temporary files are cleaned up on both success and failure paths
- [ ] LibreOffice calls are serialized (no concurrent-invocation profile conflicts)
- [ ] API tests exist for all documented error codes, not just the happy path
- [ ] Frontend tests exist for IDLE, UPLOADING, PROCESSING, COMPLETED, and ERROR states
- [ ] Application runs through Docker (single `docker-compose up`)
- [ ] README contains setup instructions, environment variables, and the stated PDF→Word fidelity limitation
