# iLovePDF Clone — Requirements

## 1. Module 1 

- Word → PDF
- PDF → Word

## Module 2 
- Merge PDF
- Split PDF

## Module 3 
- Compress PDF
- Organize PDF

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

### 2.5 Compress PDF

The system must:

Accept a single .pdf file

Reject unsupported file types (UNSUPPORTED_FILE_TYPE)

Validate maximum file size (FILE_TOO_LARGE)

Reject unreadable or corrupted PDFs (CORRUPTED_DOCUMENT)

Reject empty/zero-page PDFs (EMPTY_DOCUMENT)

Support three compression levels:

low

recommended

extreme

Use PyMuPDF-based PDF optimization for compression

Generate compressed.pdf

Provide the compressed PDF for download

Return the original file size and compressed file size in the response headers

Return the calculated reduction percentage in the X-Reduction-Percent response header

Ensure a failed compression request does not crash the backend

Delete temporary files after processing, including on failure

Compression configuration:

low: lighter optimization

recommended: default compression level

extreme: stronger PDF optimization

The default level is configurable through DEFAULT_COMPRESSION_LEVEL and defaults to recommended.

Known behavior: compression is optimization-based and does not guarantee that every PDF will become smaller. For PDFs that are already optimized, the resulting file may have little or no size reduction.

### 2.6 Organize PDF

The system must:

- Accept a single .pdf file
- Reject unsupported file types (UNSUPPORTED_FILE_TYPE)
- Validate maximum file size (FILE_TOO_LARGE)
- Reject unreadable or corrupted PDFs (CORRUPTED_DOCUMENT)
- Provide the PDF page count before organization
- Accept a page specification containing page numbers and optional rotation
- Use zero-based page indexes internally
- Allow pages to be reordered by changing their order in the page specification
- Allow pages to be removed by omitting them from the page specification
- Allow individual pages to be rotated by 0, 90, 180, or 270 degrees
- Reject invalid page specifications with INVALID_PAGE_SPEC
- Generate organized.pdf
- Provide the organized PDF for download
- Delete temporary files after processing, including on failure

A valid page specification has the following logical structure:

[
  {"page": 2, "rotation": 0},
  {"page": 0, "rotation": 90},
  {"page": 1, "rotation": 0}
]

Here, page is zero-based. The order determines the output page order. A page not included in the list is removed from the output.

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

**Compress PDF Page**

- Single PDF upload
- Compression level selector:
 - Low
 - Recommended
 - Extreme
- Recommended level selected by default
- Upload progress indicator
- Processing indicator
- Display original file size after processing
- Display compressed file size after processing
- Display percentage reduction after processing
- Download button for the compressed PDF
- Error state with a mapped, user-friendly error message
- "Try Again" behavior that resets the tool state

**Organize PDF Page**

- Single PDF upload
- Load and display the PDF page count before organization
- Display pages in an order that can be changed by the user
- Reordering controls
- Remove-page control
- Page rotation control
- Clear visual indication of the available organize actions
- Organize button
- Upload/processing indicator
- Success/download state
- Error state with a mapped, user-friendly error message
- "Try Again" behavior that resets the tool state

## 4. Backend Requirements

Endpoints:
```text
POST /api/v1/convert/word-to-pdf
POST /api/v1/convert/pdf-to-word
POST /api/v1/pdf/merge
POST /api/v1/pdf/split
POST /api/v1/pdf/compress
POST /api/v1/pdf/organize/info
POST /api/v1/pdf/organize
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
- For Organize specifically: validate every page specification entry against the document page count before producing the output
- Return compression metadata through response headers:
 - X-Original-Size
 - X-Compressed-Size
 - X-Reduction-Percent

## 5. File Requirements

**Maximum file size:** 25 MB (`MAX_FILE_SIZE_MB`, configurable)

**Conversion timeout:** 60 seconds default (`CONVERSION_TIMEOUT_SECONDS`, configurable)

**Minimum files to merge:** 2 (`MIN_FILES_FOR_MERGE`, configurable)

**Default compression level:** recommended(`DEFAULT_COMPRESSION_LEVEL`, configurable) 
**Allowed input formats:**
```text
Word → PDF:  .doc, .docx
PDF → Word:  .pdf
Merge PDF:   .pdf
Split PDF:   .pdf 
Compress PDF: .pdf
Organize PDF: .pdf
```

**Output formats:**
```text
Word → PDF:  .pdf
PDF → Word:  .docx
Merge PDF:   .pdf
Split PDF:   .zip
Compress PDF:  .pdf
Organize PDF:  .pdf
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

These are added incrementally, one module at a time, after Module 3 is stable.

