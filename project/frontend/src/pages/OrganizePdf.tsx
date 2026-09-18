import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import { FileUploader } from "../components/FileUploader";
import { UploadProgress } from "../components/UploadProgress";
import { DownloadButton } from "../components/DownloadButton";
import { PageListEditor } from "../components/PageListEditor";

import {
  getOrganizeInfo,
  organizePdf,
} from "../services/api";

import { copyForError } from "../utils/errorMessages";

import type {
  ConversionResult,
  ConversionState,
} from "../types/conversion";

pdfjsLib.GlobalWorkerOptions.workerSrc = `${pdfWorker}?v=2`;

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

  const [selectedPage, setSelectedPage] =
    useState(0);

  const [preview, setPreview] =
    useState<string | undefined>();

  const [uploadPercent, setUploadPercent] =
    useState(0);

  const [result, setResult] =
    useState<ConversionResult | null>(null);

  const [error, setError] =
    useState<{
      code: string;
      message: string;
    } | null>(null);


  /*
   * Render selected page
   */
  useEffect(() => {
    if (
      !file ||
      pages.length === 0 ||
      !pages[selectedPage]
    ) {
      return;
    }

    let cancelled = false;

    const renderPreview = async () => {
      try {
        const buffer =
          await file.arrayBuffer();

        const pdf =
          await pdfjsLib
            .getDocument({
              data: buffer,
            })
            .promise;

        const selected =
          pages[selectedPage];

        const page =
          await pdf.getPage(
            selected.originalPage + 1
          );

        const viewport =
          page.getViewport({
            scale: 1.5,
            rotation:
              selected.rotation,
          });

        const canvas =
          document.createElement("canvas");

        const context =
          canvas.getContext("2d");

        if (!context) return;

        canvas.width =
          viewport.width;

        canvas.height =
          viewport.height;

        await page.render({
          canvas,
          canvasContext: context,
          viewport,
        }).promise;

        if (!cancelled) {
          setPreview(
            canvas.toDataURL(
              "image/png"
            )
          );
        }
      } catch (err) {
        console.error(
          "Selected page preview error:",
          err
        );
      }
    };

    renderPreview();

    return () => {
      cancelled = true;
    };
  }, [
    file,
    pages,
    selectedPage,
  ]);

  /*
   * Select PDF
   */
  const handleFileSelected = async (
    selected: File
  ) => {
    setFile(selected);
    setError(null);
    setResult(null);
    setPages([]);

    setPreview(undefined);
    setSelectedPage(0);
    setState("PROCESSING");

    try {
      const info =
        await getOrganizeInfo(
          selected
        );

      const initialPages: PageItem[] =
        Array.from(
          {
            length:
              info.page_count,
          },
          (_, index) => ({
            id: index,
            originalPage: index,
            rotation: 0,
          })
        );

      setPages(initialPages);
      setSelectedPage(0);
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

  /*
   * Keep selected page valid
   */
  const handlePagesChange = (
    nextPages: PageItem[]
  ) => {
    setPages(nextPages);

    if (
      selectedPage >=
      nextPages.length
    ) {
      setSelectedPage(
        Math.max(
          0,
          nextPages.length - 1
        )
      );
    }
  };

  /*
   * Reset
   */
  const reset = () => {
    setState("IDLE");
    setFile(null);
    setPages([]);
    setPreview(undefined);
    setSelectedPage(0);
    setUploadPercent(0);
    setResult(null);
    setError(null);
  };

  /*
   * Organize
   */
  const handleOrganize = async () => {
    if (
      !file ||
      pages.length === 0
    ) {
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
            page:
              page.originalPage,
            rotation:
              page.rotation,
          })),
          setUploadPercent,
          () =>
            setState(
              "PROCESSING"
            )
        );

      setResult(
        organizeResult
      );

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

  /*
   * Upload screen
   */
  if (state === "IDLE") {
    return (
      <div className="organize-upload-page">
        <Link
          to="/"
          className="organize-brand"
        >
          <span>papercut</span>
          <i />
        </Link>

        <div className="organize-upload-content">
          <Link
            to="/"
            className="back-link"
          >
            ← Back
          </Link>

          <h1>Organize PDF</h1>

          <p className="lede">
            Reorder, rotate, or remove
            pages from a PDF.
          </p>

          <FileUploader
            accept=".pdf"
            onFileSelected={
              handleFileSelected
            }
            supportedInfo="Accepts .pdf, up to 25 MB."
          />
        </div>
      </div>
    );
  }

  /*
   * Completed screen
   */
  if (
    state === "COMPLETED" &&
    result
  ) {
    return (
      <div className="organize-upload-page">
        <Link
          to="/"
          className="organize-brand"
        >
          <span>papercut</span>
          <i />
        </Link>

        <div className="organize-upload-content">
          <h1>
            Your PDF is ready
          </h1>

          <DownloadButton
            result={result}
            onReset={reset}
          />
        </div>
      </div>
    );
  }

  /*
   * Error screen
   */
  if (
    state === "ERROR" &&
    error
  ) {
    return (
      <div className="organize-upload-page">
        <Link
          to="/"
          className="organize-brand"
        >
          <span>papercut</span>
          <i />
        </Link>

        <div className="organize-upload-content">
          <div className="error-box">
            <p className="error-box__title">
              {
                copyForError(
                  error.code
                ).title
              }
            </p>

            <p className="error-box__msg">
              {
                copyForError(
                  error.code
                ).message
              }
            </p>
          </div>

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
    );
  }

  /*
   * Main Organize editor
   */
  return (
    <div className="organize-editor">

      {/* TOP HEADER */}
      <header className="organize-header">
        <Link
          to="/"
          className="organize-brand"
        >
          <span>papercut</span>
          <i />
        </Link>

        <Link
          to="/"
          className="organize-back"
        >
          ← Back
        </Link>

        <p>
          Reorder, rotate, or remove
          pages from a PDF.
        </p>

      </header>

      {/* WORKSPACE */}
      <main className="organize-main">

        {/* LEFT SIDEBAR */}
        <PageListEditor
          pages={pages}
          onChange={
            handlePagesChange
          }
          selectedPage={
            selectedPage
          }
          onSelectPage={
            setSelectedPage
          }

        />

        {/* CENTER VIEWER */}
        <section className="organize-viewer">

          {/* VIEWER HEADER */}
          <div className="organize-viewer-header">
            <strong>
              {file?.name}
            </strong>

            <button
              type="button"
              className="organize-submit"
              onClick={
                handleOrganize
              }
              disabled={
                pages.length === 0 ||
                state ===
                "UPLOADING" ||
                state ===
                "PROCESSING"
              }
            >
              Organize PDF →
            </button>
          </div>



          {/* PDF */}
          <div className="organize-viewer-body">

            <button
              type="button"
              className="organize-nav-arrow organize-nav-arrow--left"
              onClick={() =>
                setSelectedPage(
                  Math.max(
                    0,
                    selectedPage - 1
                  )
                )
              }
              disabled={
                selectedPage === 0
              }
              title="Previous page"
            >
              ‹
            </button>

            <div className="organize-document">
              {preview ? (
                <img
                  src={preview}
                  alt={`Page ${selectedPage + 1
                    }`}
                />
              ) : (
                <div className="organize-loading">
                  Loading preview...
                </div>
              )}
            </div>

            <button
              type="button"
              className="organize-nav-arrow organize-nav-arrow--right"
              onClick={() =>
                setSelectedPage(
                  Math.min(
                    pages.length - 1,
                    selectedPage + 1
                  )
                )
              }
              disabled={
                selectedPage ===
                pages.length - 1
              }
              title="Next page"
            >
              ›
            </button>
            {/* PAGE ACTIONS */}
            <div className="organize-page-actions">

              <button
                type="button"
                onClick={() => {
                  const next = [...pages];

                  next[selectedPage] = {
                    ...next[selectedPage],
                    rotation:
                      (
                        next[selectedPage]
                          .rotation + 90
                      ) % 360,
                  };

                  setPages(next);
                }}
                title="Rotate page"
              >
                ↻ Rotate
              </button>

              <button
                type="button"
                className="remove"
                disabled={pages.length === 1}
                onClick={() => {
                  if (pages.length === 1) {
                    return;
                  }

                  const next =
                    pages.filter(
                      (_, index) =>
                        index !==
                        selectedPage
                    );

                  setPages(next);

                  setSelectedPage(
                    Math.min(
                      selectedPage,
                      next.length - 1
                    )
                  );
                }}
                title="Remove page"
              >
                ✕ Remove
              </button>

            </div>
          </div>


        </section>
      </main>

      {(state === "UPLOADING" ||
        state === "PROCESSING") &&
        file && (
          <div className="organize-progress">
            <UploadProgress
              fileName={file.name}
              state={state}
              uploadPercent={
                uploadPercent
              }
              processingLabel="Organizing…"
            />
          </div>
        )}
    </div>
  );
}