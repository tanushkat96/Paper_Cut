import { useState } from "react";
import { Link } from "react-router-dom";

import { FileUploader } from "../components/FileUploader";
import { UploadProgress } from "../components/UploadProgress";
import { DownloadButton } from "../components/DownloadButton";
import { splitPdf } from "../services/api";
import { copyForError } from "../utils/errorMessages";
import { formatFileSize } from "../utils/formatFileSize";
import { ConversionResult, ConversionState } from "../types/conversion";

type SplitMode = "every-page" | "custom";

export function SplitPdf() {
  const [state, setState] = useState<ConversionState>("IDLE");
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<SplitMode>("every-page");
  const [pageRanges, setPageRanges] = useState("");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const reset = () => {
    setState("IDLE");
    setFile(null);
    setMode("every-page");
    setPageRanges("");
    setUploadPercent(0);
    setResult(null);
    setError(null);
  };

  const handleFileSelected = (selected: File) => {
    setFile(selected);
    setState("FILE_SELECTED");
    setError(null);
  };

  const handleSplit = async () => {
    if (!file) return;

    if (mode === "custom" && !pageRanges.trim()) {
      setError({ code: "INVALID_PAGE_RANGE", message: "Enter a page range, e.g. 1-3,5,7-9." });
      setState("ERROR");
      return;
    }

    setState("UPLOADING");
    setError(null);
    setUploadPercent(0);

    try {
      const splitResult = await splitPdf(
        file,
        mode === "custom" ? pageRanges.trim() : null,
        (percent) => setUploadPercent(percent),
        () => setState("PROCESSING")
      );
      setResult(splitResult);
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

      <h1>Split PDF</h1>
      <p className="lede">
        Break a PDF into separate files — one per page, or by the ranges you choose. You'll get
        back a ZIP of the results.
      </p>

      {state === "IDLE" && (
        <FileUploader
          accept=".pdf"
          onFileSelected={handleFileSelected}
          supportedInfo="Accepts .pdf, up to 25 MB."
        />
      )}

      {state === "FILE_SELECTED" && file && (
        <>
          <div className="status-panel">
            <p className="status-panel__file">
              {file.name} — {formatFileSize(file.size)}
            </p>

            <div className="mode-options">
              <label className={`mode-option ${mode === "every-page" ? "mode-option--active" : ""}`}>
                <input
                  type="radio"
                  name="split-mode"
                  checked={mode === "every-page"}
                  onChange={() => setMode("every-page")}
                />
                <span>
                  <span className="mode-option__label">Every page</span>
                  <p className="mode-option__hint">Splits the PDF into one file per page.</p>
                </span>
              </label>

              <label className={`mode-option ${mode === "custom" ? "mode-option--active" : ""}`}>
                <input
                  type="radio"
                  name="split-mode"
                  checked={mode === "custom"}
                  onChange={() => setMode("custom")}
                />
                <span>
                  <span className="mode-option__label">Custom ranges</span>
                  <p className="mode-option__hint">e.g. 1-3,5,7-9 — one file per range, in that order.</p>
                  {mode === "custom" && (
                    <input
                      className="range-input"
                      type="text"
                      placeholder="1-3,5,7-9"
                      value={pageRanges}
                      onChange={(e) => setPageRanges(e.target.value)}
                      onClick={(e) => e.preventDefault()}
                    />
                  )}
                </span>
              </label>
            </div>

            <div className="button-row">
              <button className="button" onClick={handleSplit}>
                Split PDF
              </button>
              <button className="button button--ghost" onClick={reset}>
                Choose a different file
              </button>
            </div>
          </div>
        </>
      )}

      {(state === "UPLOADING" || state === "PROCESSING") && file && (
        <UploadProgress
          fileName={file.name}
          state={state}
          uploadPercent={uploadPercent}
          processingLabel="Splitting…"
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
            <button className="button" onClick={() => setState(file ? "FILE_SELECTED" : "IDLE")}>
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
