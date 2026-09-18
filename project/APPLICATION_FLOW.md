# iLovePDF Clone — Application Flow

## 1. Application Entry

```text
User
 |
 ▼
Landing Page
 |
 ├── Word to PDF
 |
 ├── PDF to Word
 |
 ├── Merge PDF
 |
 ├── Split PDF
 |
 ├── Compress PDF
 |
 └── Organize PDF
```

---

## 2. Word → PDF Flow

```text
User
 |
 ▼
Word to PDF page
 |
 ▼
Select / Drag & Drop .doc/.docx
 |
 ▼
Frontend validation (extension, size)
 |
 ├── Invalid → Show error
 |
 └── Valid
       |
       ▼
Upload file
       |
       ▼
Backend API
       |
       ▼
Validate file (extension, MIME, size)
       |
       ├── Invalid → Error response
       |
       └── Valid
              |
              ▼
        Create UUID-named temp workspace
              |
              ▼
        Acquire LibreOffice conversion slot (queue if busy)
              |
              ▼
        LibreOffice conversion (bounded by timeout)
              |
              ├── Timeout → CONVERSION_TIMEOUT
              ├── Failed  → CONVERSION_FAILED
              |
              └── Success
                    |
                    ▼
                Generate PDF
                    |
                    ▼
              Return PDF
                    |
                    ▼
             Download button
                    |
                    ▼
             User downloads PDF
                    |
                    ▼
             Cleanup temp workspace (always, even on error)
```

---

## 3. PDF → Word Flow

```text
User
 |
 ▼
PDF to Word page
 |
 ▼
Select / Drag & Drop PDF
 |
 ▼
Frontend validation (extension, size)
 |
 ├── Invalid → Show error
 |
 └── Valid
       |
       ▼
Upload file
       |
       ▼
Backend API
       |
       ▼
Validate PDF (extension, MIME, size)
       |
       ├── Invalid → Error
       |
       └── Valid
              |
              ▼
          Create UUID-named temp workspace
              |
              ▼
          Extract text via PyMuPDF
              |
              ├── No extractable text → NO_TEXT_LAYER error
              |
              └── Text found
                    |
                    ▼
              Generate DOCX via python-docx
                    |
                    ├── Failed → CONVERSION_FAILED
                    |
                    └── Success
                          |
                          ▼
                     Return DOCX
                          |
                          ▼
                    Download button
                          |
                          ▼
                   User downloads DOCX
                          |
                          ▼
                   Cleanup temp workspace (always, even on error)
```
----
## 4. Merge PDF Flow

```text
User
 |
 ▼
Merge PDF page
 |
 ▼
Select multiple PDFs (drag & drop or browse)
 |
 ▼
Files shown in a list, in selection order
 |
 ▼
User reorders (↑ / ↓) and/or removes files
 |
 ▼
User clicks "Merge PDF"
 |
 ├── Fewer than 2 files → Show error (TOO_FEW_FILES), no request sent
 |
 └── 2+ files
       |
       ▼
Upload all files (multipart, field name "files", in list order)
       |
       ▼
Backend API
       |
       ▼
Validate every file (extension, MIME, size — same rules as other PDF uploads)
       |
       ├── Any invalid → Error response, no partial merge
       |
       └── All valid
              |
              ▼
        Save each into request workspace (order preserved)
              |
              ▼
        PyMuPDF: insert_pdf() each file into a new document, in order
              |
              ├── Any file unreadable/corrupted → CORRUPTED_DOCUMENT
              |
              └── Success
                    |
                    ▼
               merged.pdf generated
                    |
                    ▼
              Return merged.pdf
                    |
                    ▼
             Download button
                    |
                    ▼
             User downloads merged.pdf
                    |
                    ▼
             Cleanup temp workspace (always, even on error)
```

React → FastAPI → validation → temporary workspace → PyMuPDF → merged PDF → response → cleanup

---

## 5. Split PDF Flow

```text
User
 |
 ▼
Split PDF page
 |
 ▼
Select / Drag & Drop a single PDF
 |
 ▼
Choose split mode
 |
 ├── Every page (default)
 |
 └── Custom ranges (e.g. "1-3,5,7-9")
       |
       ▼
User clicks "Split PDF"
       |
       ▼
Upload file (+ page_ranges if custom mode)
       |
       ▼
Backend API
       |
       ▼
Validate PDF (extension, MIME, size)
       |
       ├── Invalid → Error
       |
       └── Valid
              |
              ▼
        Save into request workspace
              |
              ▼
        PyMuPDF: read page count
              |
              ▼
        Determine ranges:
          - no page_ranges → one range per page
          - page_ranges given → parse & validate against the PDF page count
              |
              ├── Malformed / out-of-bounds → INVALID_PAGE_RANGE
              |
              └── Valid ranges
                    |
                    ▼
              For each range, in requested order:
                insert_pdf(from_page, to_page) into a new doc
                save as page-N.pdf or pages-A-B.pdf
                    |
                    ├── Failure → CONVERSION_FAILED
                    |
                    └── Success
                          |
                          ▼
                    zipfile: bundle all generated PDFs
                          |
                          ├── Zip failure → ZIP_CREATION_FAILED
                          |
                          └── Success
                                |
                                ▼
                          Return split-pdf.zip
                                |
                                ▼
                         Download button
                                |
                                ▼
                        User downloads split-pdf.zip
                                |
                                ▼
                        Cleanup temp workspace (always, even on error)
```

React → FastAPI → validation → PyMuPDF → individual PDFs → ZIP → response → cleanup

---

## 6. Compress PDF Flow

```text
User
 |
 ▼
Compress PDF page
 |
 ▼
Select / Drag & Drop a single PDF
 |
 ▼
Choose compression level
 |
 ├── low
 ├── recommended
 └── extreme
 |
 ▼
User clicks "Compress PDF"
 |
 ▼
Upload file
 |
 ▼
Backend API
 |
 ▼
Validate PDF (extension, MIME, size)
 |
 ├── Invalid → Error response
 |
 └── Valid
        |
        ▼
     Create UUID-named temp workspace
        |
        ▼
     PyMuPDF optimization (level-aware)
        |
        ├── Failed → CONVERSION_FAILED
        |
        └── Success
              |
              ▼
         Compute original/compressed sizes and reduction percentage
              |
              ▼
         Return compressed.pdf with response headers
              |
              ▼
         Download button
              |
              ▼
         User downloads compressed PDF
              |
              ▼
         Cleanup temp workspace (always, even on error)
```

React → FastAPI → validation → PyMuPDF optimization → response headers → cleanup

---

## 7. Organize PDF Flow

```text
User
 |
 ▼
Organize PDF page
 |
 ▼
Select / Drag & Drop a PDF
 |
 ▼
Upload PDF
 |
 ▼
POST /api/v1/pdf/organize/info
 |
 ▼
Backend validates PDF
 |
 ▼
Return page count
 |
 ▼
Initialize page list
 |
 ▼
Organize Editor
 |
 ├── Select page
 │      |
 │      ▼
 │   Show selected page in center preview
 │
 ├── Drag & Drop
 │      |
 │      ▼
 │   Change page order
 │
 ├── Rotate
 │      |
 │      ▼
 │   Rotate selected page by 90°
 │
 └── Remove
        |
        ▼
     Remove selected page
        |
        ▼
User clicks "Organize PDF"
        |
        ▼
Create page specification
        |
        ▼
POST /api/v1/pdf/organize
        |
        ▼
Backend
        |
        ▼
Validate file
        |
        ▼
Validate page specification
        |
        ├── Invalid
        │      |
        │      ▼
        │   INVALID_PAGE_SPEC
        │
        └── Valid
               |
               ▼
          PyMuPDF
               |
               ▼
          Reorder pages
               |
               ▼
          Apply rotations
               |
               ▼
          organized.pdf
               |
               ▼
          Download response
               |
               ▼
          Cleanup
```

React → FastAPI → validation → page-spec parsing → PyMuPDF reorganize → download → cleanup

---



## 8. Frontend State Flow

```text
IDLE
 |
 ▼
FILE_SELECTED
 |
 ▼
UPLOADING
 |
 ▼
PROCESSING
 |
 ▼
COMPLETED
 |
 ▼
DOWNLOAD
```

Error can occur from any processing state:

```text
IDLE
FILE_SELECTED
UPLOADING
PROCESSING
    |
    └──── ERROR ──── (Try Again → back to IDLE)
```

The UI must map each backend error `code` to a distinct, user-readable message — not a single generic "something went wrong" (see Section 11 for the full code list and suggested copy).

---

## 9. Word → PDF API

### Request

```http
POST /api/v1/convert/word-to-pdf
Content-Type: multipart/form-data

file = document.docx
```

### Success

```http
200 OK
Content-Type: application/pdf
```

### Failure

```json
{
  "success": false,
  "error": {
    "code": "CONVERSION_FAILED",
    "message": "Unable to convert document."
  }
}
```

---

## 10. PDF → Word API

### Request

```http
POST /api/v1/convert/pdf-to-word
Content-Type: multipart/form-data

file = document.pdf
```

### Success

```http
200 OK
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

### Failure (e.g. scanned PDF)

```json
{
  "success": false,
  "error": {
    "code": "NO_TEXT_LAYER",
    "message": "This PDF appears to be scanned or image-based and has no extractable text. OCR support is planned for a future release."
  }
}
```

---

## 11. File Validation Flow & Error Codes

```text
File received
     |
     ▼
Extension check
     |
     ▼
MIME/type check
     |
     ▼
File size check
     |
     ▼
Content validation (readable, not corrupted)
     |
     ├── Failed → Reject with specific code
     |
     └── Passed → Process
```

| Failure point               | Error code                | Example user-facing message                                                         |
| --------------------------- | ------------------------- | ----------------------------------------------------------------------------------- |
| Extension check             | `UNSUPPORTED_FILE_TYPE`   | "This file type isn't supported. Please upload a .doc, .docx, or .pdf file."        |
| Size check                  | `FILE_TOO_LARGE`          | "This file exceeds the 25 MB limit."                                                |
| Content validation          | `CORRUPTED_DOCUMENT`      | "This file couldn't be read. It may be corrupted."                                  |
| PDF text extraction         | `NO_TEXT_LAYER`           | "This PDF has no selectable text (likely scanned). OCR isn't supported yet."        |
| Conversion engine           | `CONVERSION_TIMEOUT`      | "This is taking longer than expected. Please try again or use a smaller file."      |
| Conversion engine           | `CONVERSION_FAILED`       | "Conversion failed. Please try again."                                              |
| Server dependency missing   | `MISSING_CONVERSION_TOOL` | "The service is temporarily unavailable. Please try again shortly "                 |
| Merge — not enough files    | `TOO_FEW_FILES`           | "Merging needs at least two PDF files."                                             |
| Split — bad range string    | `INVALID_PAGE_RANGE`      | "Check the page range — it should look like 1-3,5,7-9 and fit within the document." |
| Split — archive step failed | `ZIP_CREATION_FAILED`     | "We couldn't build the download archive. Please try again."                         |
| Anything unexpected         | `INTERNAL_ERROR`          | "Something went wrong on our end."                                                  |

Limits are configurable via environment variables:

```env
MAX_FILE_SIZE_MB=25
CONVERSION_TIMEOUT_SECONDS=60
MIN_FILES_FOR_MERGE=2
```

---

## 12. Cleanup Flow

```text
Request starts
     |
     ▼
Create UUID-named temp workspace
     |
     ▼
Save uploaded file into workspace
     |
     ▼
Perform conversion
     |
     ▼
Return generated file
     |
     ▼
Cleanup workspace (finally block — runs on success AND failure)
```

Because each request has its own workspace directory, cleanup for one request never races with, or accidentally deletes, another in-flight request's files.

---

## 13. Future User Flow

After Module 3 is stable:

```text
Home
 |
 ├── Word to PDF
 ├── PDF to Word
 ├── Merge PDF
 ├── Split PDF
 ├── Compress PDF
 ├── Organize PDF
 ├── PDF to JPG
 ├── JPG to PDF
 ├── Rotate PDF
 ├── Watermark PDF
 ├── OCR PDF
 └── ...
```

Each future operation reuses the same pattern:

```text
Upload
   ↓
Validate
   ↓
Process
   ↓
Generate output
   ↓
Download
   ↓
Cleanup
```
