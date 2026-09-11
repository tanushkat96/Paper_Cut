import { ErrorCode } from "../types/conversion";

// Maps each backend error code to a distinct, user-readable message.
// See APPLICATION_FLOW.md, Section 7.
export const ERROR_COPY: Record<string, { title: string; message: string }> = {
  UNSUPPORTED_FILE_TYPE: {
    title: "Unsupported file",
    message: "This file type isn't supported. Please check the accepted formats below.",
  },
  FILE_TOO_LARGE: {
    title: "File too large",
    message: "This file exceeds the 25 MB limit.",
  },
  CORRUPTED_DOCUMENT: {
    title: "Couldn't read this file",
    message: "This file couldn't be read. It may be corrupted.",
  },
  NO_TEXT_LAYER: {
    title: "No text found",
    message:
      "This PDF has no selectable text — it's likely scanned. OCR support isn't available yet.",
  },
  CONVERSION_TIMEOUT: {
    title: "Taking too long",
    message: "This is taking longer than expected. Try again, or use a smaller file.",
  },
  CONVERSION_FAILED: {
    title: "Conversion failed",
    message: "We couldn't convert this file. Please try again.",
  },
  MISSING_CONVERSION_TOOL: {
    title: "Service unavailable",
    message: "The service is temporarily unavailable. Please try again shortly.",
  },
  INTERNAL_ERROR: {
    title: "Something went wrong",
    message: "Something went wrong on our end. Please try again.",
  },
};

export function copyForError(code: string): { title: string; message: string } {
  return ERROR_COPY[code as ErrorCode] ?? ERROR_COPY.INTERNAL_ERROR;
}
