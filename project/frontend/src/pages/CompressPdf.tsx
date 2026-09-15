import { useState } from "react";
import { Link } from "react-router-dom";

import { FileUploader } from "../components/FileUploader";
import { UploadProgress } from "../components/UploadProgress";
import { DownloadButton } from "../components/DownloadButton";
import { compressPdf } from "../services/api";
import { copyForError } from "../utils/errorMessages";
import { formatFileSize } from "../utils/formatFileSize";
import {
  ConversionResult,
  ConversionState,
} from "../types/conversion";

type CompressionLevel =
  | "low"
  | "recommended"
  | "extreme";

type CompressionResult = ConversionResult & {
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
};

export function CompressPdf() {
  const [state, setState] =
    useState<ConversionState>("IDLE");

  const [file, setFile] =
    useState<File | null>(null);

  const [level, setLevel] =
    useState<CompressionLevel>("recommended");

  const [uploadPercent, setUploadPercent] =
    useState(0);

  const [result, setResult] =
    useState<CompressionResult | null>(null);

  const [error, setError] =
    useState<{ code: string; message: string } | null>(
      null
    );

  const reset = () => {
    setState("IDLE");
    setFile(null);
    setLevel("recommended");
    setUploadPercent(0);
    setResult(null);
    setError(null);
  };

  const handleFileSelected = (selected: File) => {
    setFile(selected);
    setState("FILE_SELECTED");
    setError(null);
  };

  const handleCompress = async () => {
    if (!file) return;

    setState("UPLOADING");
    setError(null);
    setUploadPercent(0);

    try {
      const compressionResult = await compressPdf(
        file,
        level,
        setUploadPercent,
        () => setState("PROCESSING")
      );

      setResult(compressionResult);
      setState("COMPLETED");
    } catch (err) {
      setError(
        err as {
          code: string;
          message: string;
        }
      );

      setState("ERROR");
    }
  };

  return (
    <div className="app-shell">
      <Link to="/" className="brand">
        <span className="brand__mark">
          papercut
        </span>
      </Link>

      <Link to="/" className="back-link">
        ← Back
      </Link>

      <h1>Compress PDF</h1>

      <p className="lede">
        Reduce PDF file size while preserving the
        document structure.
      </p>

      {state === "IDLE" && (
        <FileUploader
          accept=".pdf"
          onFileSelected={handleFileSelected}
          supportedInfo="Accepts .pdf, up to 25 MB."
        />
      )}

      {state === "FILE_SELECTED" && file && (
        <div className="status-panel">
          <p className="status-panel__file">
            {file.name} — {formatFileSize(file.size)}
          </p>

          <div className="mode-options">
            <label
              className={`mode-option ${
                level === "low"
                  ? "mode-option--active"
                  : ""
              }`}
            >
              <input
                type="radio"
                name="compression-level"
                checked={level === "low"}
                onChange={() =>
                  setLevel("low")
                }
              />

              <span>
                <span className="mode-option__label">
                  Low compression
                </span>

                <p className="mode-option__hint">
                  Conservative optimization.
                </p>
              </span>
            </label>

            <label
              className={`mode-option ${
                level === "recommended"
                  ? "mode-option--active"
                  : ""
              }`}
            >
              <input
                type="radio"
                name="compression-level"
                checked={
                  level === "recommended"
                }
                onChange={() =>
                  setLevel("recommended")
                }
              />

              <span>
                <span className="mode-option__label">
                  Recommended
                </span>

                <p className="mode-option__hint">
                  Balanced file-size reduction.
                </p>
              </span>
            </label>

            <label
              className={`mode-option ${
                level === "extreme"
                  ? "mode-option--active"
                  : ""
              }`}
            >
              <input
                type="radio"
                name="compression-level"
                checked={level === "extreme"}
                onChange={() =>
                  setLevel("extreme")
                }
              />

              <span>
                <span className="mode-option__label">
                  Extreme compression
                </span>

                <p className="mode-option__hint">
                  Most aggressive structural
                  optimization.
                </p>
              </span>
            </label>
          </div>

          <div className="button-row">
            <button
              className="button"
              onClick={handleCompress}
            >
              Compress PDF
            </button>

            <button
              className="button button--ghost"
              onClick={reset}
            >
              Choose a different file
            </button>
          </div>
        </div>
      )}

      {(state === "UPLOADING" ||
        state === "PROCESSING") &&
        file && (
          <UploadProgress
            fileName={file.name}
            state={state}
            uploadPercent={uploadPercent}
            processingLabel="Compressing…"
          />
        )}

      {state === "COMPLETED" && result && (
        <div className="status-panel">
          <h2>Compression complete</h2>

          <p>
            Original size:{" "}
            {formatFileSize(result.originalSize)}
          </p>

          <p>
            Compressed size:{" "}
            {formatFileSize(
              result.compressedSize
            )}
          </p>

          <p>
            Reduced by:{" "}
            {result.reductionPercent.toFixed(2)}%
          </p>

          <DownloadButton
            result={result}
            onReset={reset}
          />
        </div>
      )}

      {state === "ERROR" && error && (
        <div>
          <div className="error-box">
            <p className="error-box__title">
              {copyForError(error.code).title}
            </p>

            <p className="error-box__msg">
              {copyForError(error.code).message}
            </p>
          </div>

          <div className="button-row">
            <button
              className="button"
              onClick={() =>
                setState(
                  file
                    ? "FILE_SELECTED"
                    : "IDLE"
                )
              }
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}