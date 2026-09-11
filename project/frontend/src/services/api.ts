import { ApiErrorBody, ConversionKind, ConversionResult } from "../types/conversion";

const ENDPOINTS: Record<ConversionKind, string> = {
  "word-to-pdf": "/api/v1/convert/word-to-pdf",
  "pdf-to-word": "/api/v1/convert/pdf-to-word",
};

/**
 * Uploads a file and runs the requested conversion. Uses XHR (not fetch)
 * so we get real upload-progress events for the UPLOADING state.
 */
export function convertFile(
  kind: ConversionKind,
  file: File,
  onUploadProgress: (percent: number) => void,
  onProcessingStart: () => void
): Promise<ConversionResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.open("POST", ENDPOINTS[kind]);
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
        const filename = match ? match[1] : `converted-${Date.now()}`;
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
