export type ConversionState =
  | "IDLE"
  | "FILE_SELECTED"
  | "UPLOADING"
  | "PROCESSING"
  | "COMPLETED"
  | "ERROR";

export type ErrorCode =
  | "UNSUPPORTED_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "CORRUPTED_DOCUMENT"
  | "NO_TEXT_LAYER"
  | "CONVERSION_TIMEOUT"
  | "CONVERSION_FAILED"
  | "MISSING_CONVERSION_TOOL"
  | "TOO_FEW_FILES"
  | "INVALID_PAGE_RANGE"
  | "ZIP_CREATION_FAILED"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  success: false;
  error: {
    code: ErrorCode | string;
    message: string;
  };
}

export interface ConversionResult {
  blob: Blob;
  filename: string;
}

export type ConversionKind = "word-to-pdf" | "pdf-to-word";
