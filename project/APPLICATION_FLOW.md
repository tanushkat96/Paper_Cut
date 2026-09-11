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
 └── PDF to Word
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

---

## 4. Frontend State Flow

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

The UI must map each backend error `code` to a distinct, user-readable message — not a single generic "something went wrong" (see Section 7 for the full code list and suggested copy).

---

## 5. Word → PDF API

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

## 6. PDF → Word API

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

## 7. File Validation Flow & Error Codes

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

| Failure point | Error code | Example user-facing message |
|---|---|---|
| Extension check | `UNSUPPORTED_FILE_TYPE` | "This file type isn't supported. Please upload a .doc, .docx, or .pdf file." |
| Size check | `FILE_TOO_LARGE` | "This file exceeds the 25 MB limit." |
| Content validation | `CORRUPTED_DOCUMENT` | "This file couldn't be read. It may be corrupted." |
| PDF text extraction | `NO_TEXT_LAYER` | "This PDF has no selectable text (likely scanned). OCR isn't supported yet." |
| Conversion engine | `CONVERSION_TIMEOUT` | "This is taking longer than expected. Please try again or use a smaller file." |
| Conversion engine | `CONVERSION_FAILED` | "Conversion failed. Please try again." |
| Server dependency missing | `MISSING_CONVERSION_TOOL` | "The service is temporarily unavailable. Please try again shortly." |
| Anything unexpected | `INTERNAL_ERROR` | "Something went wrong on our end." |

Limits are configurable via environment variables:

```env
MAX_FILE_SIZE_MB=25
CONVERSION_TIMEOUT_SECONDS=60
```

---

## 8. Cleanup Flow

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

## 9. Future User Flow

After Module 1 is stable:

```text
Home
 |
 ├── Word to PDF
 ├── PDF to Word
 ├── Merge PDF
 ├── Split PDF
 ├── Compress PDF
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
