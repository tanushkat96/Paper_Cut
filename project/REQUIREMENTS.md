# iLovePDF Clone — Requirements

## 1. Module 1 Scope

- Word → PDF
- PDF → Word

**Module 2 (implemented):**
- Merge PDF
- Split PDF

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

### 2.3 Merge PDF
The system must:
- Accept 2 or more `.pdf` files in a single request
- Reject the request if fewer than `MIN_FILES_FOR_MERGE` (default 2) files are supplied (`TOO_FEW_FILES`)
- Validate every file individually (extension, MIME type, size) before processing any of them
- Merge pages in exactly the order the files were supplied, preserving page content, dimensions, and rotation
- Reject the whole request if any single file is unreadable/corrupted (`CORRUPTED_DOCUMENT`) — no partial merge is produced
- Provide the generated `merged.pdf` for download
- Delete all temporary files (every input plus the merged output) after processing, including on failure

### 2.4 Split PDF
The system must:
- Accept a single `.pdf` file
- Default to splitting every page into its own PDF when no page range is supplied
- Optionally accept a `page_ranges` parameter (e.g. `1-3,5,7-9`) to split by custom ranges instead
- Validate page ranges: integers only, `>= 1`, within the document's page count, `start <= end` per range, and reject malformed input outright (`INVALID_PAGE_RANGE`) rather than silently correcting it
- Preserve the requested range order in the output; duplicate/overlapping ranges each produce their own output file rather than being merged or deduplicated
- Package all generated PDFs into a single ZIP archive for download
- Delete all temporary files (uploaded PDF, generated PDFs, and ZIP) after processing, including on failure

## 3. Frontend Requirements

**Landing Page**
- Application name and description
- Word → PDF tool entry point
- PDF → Word tool entry point
- Merge PDF tool entry point
- Split PDF tool entry point

**Conversion Page (Word ↔ PDF)**
- File upload button
- Drag-and-drop support
- Supported file info (types, 25 MB max)
- Upload progress indicator
- Processing indicator
- Success state
- Download button
- Error state with the specific error message (mapped from error `code`, not a generic fallback)
- "Try Again" button that resets to `IDLE`

**Merge PDF Page**
- Multi-file upload (drag-and-drop or browse), no artificial cap beyond per-file size limits
- Selected-file list showing name, size, and position
- Reordering controls and a per-file remove control
- Clear indication that files merge in the order shown
- "Clear all" option
- Merge button, disabled until at least 2 files are selected
- Upload/processing indicator, success/download state, error state — same conventions as the Conversion Page

**Split PDF Page**
- Single-file upload
- Split mode selector: "Every page" (default) vs. "Custom ranges"
- Page-range text input shown only in custom mode, with format guidance (e.g. `1-3,5,7-9`)
- Split button, upload/processing indicator, ZIP download on success, error state — same conventions as the Conversion Page


## 4. Backend Requirements

Endpoints:
```text
POST /api/v1/convert/word-to-pdf
POST /api/v1/convert/pdf-to-word
POST /api/v1/pdf/merge
POST /api/v1/pdf/split
```

The backend must:
- Validate files (extension, MIME type, size, corruption)
- Generate unique, UUID-named temporary workspace paths per request
- Perform conversion under a bounded concurrency model (single-concurrency queue for Word→PDF specifically, due to LibreOffice; Merge/Split have no such constraint) and a hard timeout where applicable
- Return generated files with correct `Content-Type` (`application/pdf` for Merge, `application/zip` for Split)
- Handle conversion errors with specific, machine-readable error codes (see Application Flow doc, Section 7)
- Never crash the server process on a conversion failure
- Clean temporary files after every request, success or failure
- For Merge specifically: validate all files before merging any of them, and reject the entire request if any file is invalid — never produce a partial merge

## 5. File Requirements

**Maximum file size:** 25 MB (`MAX_FILE_SIZE_MB`, configurable)

**Conversion timeout:** 60 seconds default (`CONVERSION_TIMEOUT_SECONDS`, configurable)

**Minimum files to merge:** 2 (`MIN_FILES_FOR_MERGE`, configurable)

**Allowed input formats:**
```text
Word → PDF:  .doc, .docx
PDF → Word:  .pdf
Merge PDF:   .pdf
Split PDF:   .pdf 
```

**Output formats:**
```text
Word → PDF:  .pdf
PDF → Word:  .docx
Merge PDF:   .pdf
Split PDF:   .zip
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

**Module 2** is complete when:

- [ ] User can select 2+ PDFs, reorder them, and remove individual files before merging
- [ ] Merge produces a single PDF with pages in exactly the selected order
- [ ] Merging with fewer than `MIN_FILES_FOR_MERGE` files is rejected with `TOO_FEW_FILES`
- [ ] A corrupted/unreadable file in a merge request is rejected with `CORRUPTED_DOCUMENT` and produces no partial output
- [ ] User can upload a single PDF and split it with the default "every page" behavior
- [ ] User can optionally specify custom page ranges (e.g. `1-3,5,7-9`) and get one PDF per range, in the requested order
- [ ] Malformed or out-of-bounds page ranges are rejected with `INVALID_PAGE_RANGE`
- [ ] Split output is delivered as a single ZIP archive containing correctly-paginated PDFs
- [ ] All temporary files (inputs, intermediate PDFs, and the ZIP) are cleaned up on both success and failure paths
- [ ] Existing Word→PDF and PDF→Word routes continue to work unmodified
- [ ] Backend tests cover: 2-file merge, 3-file merge with order verification, too-few-files rejection, corrupted-file rejection, non-PDF rejection; single-page split, multi-page split, custom-range split, out-of-bounds range, malformed range, corrupted-file rejection, non-PDF rejection
- [ ] Frontend tests cover the Merge PDF and Split PDF pages rendering their initial state
- [ ] No new runtime dependencies were required (PyMuPDF, python-docx, and stdlib `zipfile` were already present)
