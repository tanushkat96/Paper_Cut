import { useState } from "react";
import { Link } from "react-router-dom";

import { FileUploader } from "../components/FileUploader";
import { UploadProgress } from "../components/UploadProgress";
import { DownloadButton } from "../components/DownloadButton";
import { PageListEditor } from "../components/PageListEditor";
import {
  getOrganizeInfo,
  organizePdf,
} from "../services/api";
import { copyForError } from "../utils/errorMessages";
import {
  ConversionResult,
  ConversionState,
} from "../types/conversion";

interface PageItem {
  id: number;
  originalPage: number;
  rotation: number;
}

export function OrganizePdf() {
  const [state, setState] =
    useState<ConversionState>("IDLE");

  const [file, setFile] =
    useState<File | null>(null);

  const [pages, setPages] =
    useState<PageItem[]>([]);

  const [uploadPercent, setUploadPercent] =
    useState(0);

  const [result, setResult] =
    useState<ConversionResult | null>(null);

  const [error, setError] =
    useState<{ code: string; message: string } | null>(
      null
    );

  const handleFileSelected = async (
    selected: File
  ) => {
    setFile(selected);
    setError(null);
    setState("PROCESSING");

    try {
      const info = await getOrganizeInfo(
        selected
      );

      const initialPages: PageItem[] =
        Array.from(
          { length: info.page_count },
          (_, index) => ({
            id: index,
            originalPage: index,
            rotation: 0,
          })
        );

      setPages(initialPages);
      setState("FILE_SELECTED");
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

  const reset = () => {
    setState("IDLE");
    setFile(null);
    setPages([]);
    setUploadPercent(0);
    setResult(null);
    setError(null);
  };

  const handleOrganize = async () => {
    if (!file || pages.length === 0) {
      setError({
        code: "EMPTY_DOCUMENT",
        message:
          "At least one page must remain in the document.",
      });

      setState("ERROR");
      return;
    }

    setState("UPLOADING");
    setError(null);
    setUploadPercent(0);

    try {
      const organizeResult =
        await organizePdf(
          file,
          pages.map((page) => ({
            page: page.originalPage,
            rotation: page.rotation,
          })),
          setUploadPercent,
          () => setState("PROCESSING")
        );

      setResult(organizeResult);
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

      <h1>Organize PDF</h1>

      <p className="lede">
        Reorder, rotate, or remove pages from a
        PDF.
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
            {file.name}
          </p>

          <PageListEditor
            pages={pages}
            onChange={setPages}
          />

          <div className="button-row">
            <button
              className="button"
              onClick={handleOrganize}
              disabled={pages.length === 0}
            >
              Organize PDF
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
            processingLabel="Organizing…"
          />
        )}

      {state === "COMPLETED" && result && (
        <DownloadButton
          result={result}
          onReset={reset}
        />
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