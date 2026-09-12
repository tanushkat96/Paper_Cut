import { useState } from "react";
import { Link } from "react-router-dom";

import { FileUploader } from "../components/FileUploader";
import { FileListEditor } from "../components/FileListEditor";
import { UploadProgress } from "../components/UploadProgress";
import { DownloadButton } from "../components/DownloadButton";
import { mergePdfs } from "../services/api";
import { copyForError } from "../utils/errorMessages";
import { ConversionResult, ConversionState } from "../types/conversion";

const MIN_FILES = 2;

export function MergePdf() {
  const [state, setState] = useState<ConversionState>("IDLE");
  const [files, setFiles] = useState<File[]>([]);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const reset = () => {
    setState("IDLE");
    setFiles([]);
    setUploadPercent(0);
    setResult(null);
    setError(null);
  };

  const addFiles = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"))]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMerge = async () => {
    if (files.length < MIN_FILES) {
      setError({ code: "TOO_FEW_FILES", message: `Merging requires at least ${MIN_FILES} PDF files.` });
      setState("ERROR");
      return;
    }

    setState("UPLOADING");
    setError(null);
    setUploadPercent(0);

    try {
      const mergeResult = await mergePdfs(
        files,
        (percent) => setUploadPercent(percent),
        () => setState("PROCESSING")
      );
      setResult(mergeResult);
      setState("COMPLETED");
    } catch (err) {
      setError(err as { code: string; message: string });
      setState("ERROR");
    }
  };

  return (
    <div className="app-shell">
      <Link to="/" className="brand">
        <span className="brand__mark">papercut</span>
      </Link>

      <Link to="/" className="back-link">
        ← Back
      </Link>

      <h1>Merge PDF</h1>
      <p className="lede">
        Combine multiple PDFs into one, in whatever order you choose. Nothing is stored — files
        are deleted the moment the download finishes.
      </p>

      {(state === "IDLE" || state === "FILE_SELECTED") && (
        <>
          <FileUploader
            accept=".pdf"
            multiple
            onFilesSelected={addFiles}
            supportedInfo="Accepts .pdf files, up to 25 MB each. At least 2 files are required."
            dropLabel="Drop PDFs here"
          />

          {files.length > 0 && (
            <FileListEditor
              files={files}
              onReorder={setFiles}
              onRemove={removeFile}
              onClearAll={() => setFiles([])}
            />
          )}

          {files.length > 0 && (
            <div className="button-row">
              <button className="button" onClick={handleMerge} disabled={files.length < MIN_FILES}>
                Merge PDF
              </button>
            </div>
          )}
        </>
      )}

      {(state === "UPLOADING" || state === "PROCESSING") && (
        <UploadProgress
          fileName={`${files.length} files`}
          state={state}
          uploadPercent={uploadPercent}
          processingLabel="Merging…"
        />
      )}

      {state === "COMPLETED" && result && <DownloadButton result={result} onReset={reset} />}

      {state === "ERROR" && error && (
        <div>
          <div className="error-box">
            <p className="error-box__title">{copyForError(error.code).title}</p>
            <p className="error-box__msg">{copyForError(error.code).message}</p>
          </div>
          <div className="button-row">
            <button className="button" onClick={reset}>
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
