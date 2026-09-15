import { ApiErrorBody, ConversionKind, ConversionResult } from "../types/conversion";

const ENDPOINTS: Record<ConversionKind, string> = {
  "word-to-pdf": "/api/v1/convert/word-to-pdf",
  "pdf-to-word": "/api/v1/convert/pdf-to-word",
};

const MERGE_ENDPOINT = "/api/v1/pdf/merge";
const SPLIT_ENDPOINT = "/api/v1/pdf/split";
const COMPRESS_ENDPOINT = "/api/v1/pdf/compress";
const ORGANIZE_INFO_ENDPOINT = "/api/v1/pdf/organize/info";
const ORGANIZE_ENDPOINT = "/api/v1/pdf/organize";


export interface OrganizeInfo {
  success: boolean;
  page_count: number;
}

/**
 * Shared upload primitive: POSTs the given FormData via XHR (not fetch) so we
 * get real upload-progress events for the UPLOADING state, and resolves with
 * the downloadable result or rejects with the backend's structured error.
 * Used by convertFile, mergePdfs, and splitPdf.
 */
function xhrUpload(
  url: string,
  formData: FormData,
  onUploadProgress: (percent: number) => void,
  onProcessingStart: () => void,
  fallbackFilename: string
): Promise<ConversionResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", url);
    xhr.responseType = "blob";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onUploadProgress(percent);
        if (percent >= 100) {
          onProcessingStart();
        }
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const contentDisposition = xhr.getResponseHeader("Content-Disposition") || "";
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        const filename = match ? match[1] : fallbackFilename;
        resolve({ blob: xhr.response as Blob, filename });
      } else {
        try {
          const text = await (xhr.response as Blob).text();
          const parsed: ApiErrorBody = JSON.parse(text);
          reject(parsed.error);
        } catch {
          reject({ code: "INTERNAL_ERROR", message: "Something went wrong on our end." });
        }
      }
    };

    xhr.onerror = () => {
      reject({ code: "INTERNAL_ERROR", message: "Could not reach the server." });
    };

    xhr.send(formData);
  });
}

/**
 * Uploads a file and runs the requested conversion (Word→PDF or PDF→Word).
 */
export function convertFile(
  kind: ConversionKind,
  file: File,
  onUploadProgress: (percent: number) => void,
  onProcessingStart: () => void
): Promise<ConversionResult> {
  const formData = new FormData();
  formData.append("file", file);
  return xhrUpload(ENDPOINTS[kind], formData, onUploadProgress, onProcessingStart, `converted-${Date.now()}`);
}

/**
 * Uploads multiple PDFs, in the given order, and merges them into one PDF.
 * The backend field name is "files" (repeated) and order is preserved.
 */
export function mergePdfs(
  files: File[],
  onUploadProgress: (percent: number) => void,
  onProcessingStart: () => void
): Promise<ConversionResult> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return xhrUpload(MERGE_ENDPOINT, formData, onUploadProgress, onProcessingStart, "merged.pdf");
}

/**
 * Uploads a single PDF and splits it — either every page (pageRanges omitted)
 * or into the given custom ranges (e.g. "1-3,5,7-9"). Returns a ZIP.
 */
export function splitPdf(
  file: File,
  pageRanges: string | null,
  onUploadProgress: (percent: number) => void,
  onProcessingStart: () => void
): Promise<ConversionResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (pageRanges) {
    formData.append("page_ranges", pageRanges);
  }
  return xhrUpload(SPLIT_ENDPOINT, formData, onUploadProgress, onProcessingStart, "split-pdf.zip");
}

export function triggerDownload(result: ConversionResult) {
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function compressPdf(
  file: File,
  level: "low" | "recommended" | "extreme",
  onUploadProgress: (percent: number) => void,
  onProcessingStart: () => void
): Promise<ConversionResult & { originalSize: number; compressedSize: number; reductionPercent: number }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("level", level);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open("POST", COMPRESS_ENDPOINT);
    xhr.responseType = "blob";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round(
          (event.loaded / event.total) * 100
        );

        onUploadProgress(percent);

        if (percent >= 100) {
          onProcessingStart();
        }
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const contentDisposition =
          xhr.getResponseHeader("Content-Disposition") || "";

        const match = contentDisposition.match(
          /filename="?([^"]+)"?/
        );

        const filename = match
          ? match[1]
          : "compressed.pdf";

        const originalSize = Number(
          xhr.getResponseHeader("X-Original-Size") || "0"
        );

        const compressedSize = Number(
          xhr.getResponseHeader("X-Compressed-Size") || "0"
        );

        const reductionPercent = Number(
          xhr.getResponseHeader("X-Reduction-Percent") || "0"
        );

        resolve({
          blob: xhr.response as Blob,
          filename,
          originalSize,
          compressedSize,
          reductionPercent,
        });

        return;
      }

      try {
        const text = await (xhr.response as Blob).text();
        const parsed: ApiErrorBody = JSON.parse(text);
        reject(parsed.error);
      } catch {
        reject({
          code: "INTERNAL_ERROR",
          message: "Something went wrong on our end.",
        });
      }
    };

    xhr.onerror = () => {
      reject({
        code: "INTERNAL_ERROR",
        message: "Could not reach the server.",
      });
    };

    xhr.send(formData);
  });
}

export async function getOrganizeInfo(
  file: File
): Promise<OrganizeInfo> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    ORGANIZE_INFO_ENDPOINT,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const parsed: ApiErrorBody = await response.json();
    throw parsed.error;
  }

  return response.json();
}
export function organizePdf(
  file: File,
  pages: Array<{ page: number; rotation: number }>,
  onUploadProgress: (percent: number) => void,
  onProcessingStart: () => void
): Promise<ConversionResult> {
  const formData = new FormData();

  formData.append("file", file);
  formData.append(
    "pages",
    JSON.stringify(pages)
  );

  return xhrUpload(
    ORGANIZE_ENDPOINT,
    formData,
    onUploadProgress,
    onProcessingStart,
    "organized.pdf"
  );
}