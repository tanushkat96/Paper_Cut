import { useState } from "react";
import { Link } from "react-router-dom";

import { FileUploader } from "./FileUploader";
import { UploadProgress } from "./UploadProgress";
import { DownloadButton } from "./DownloadButton";
import { convertFile } from "../services/api";
import { copyForError } from "../utils/errorMessages";
import { ConversionKind, ConversionResult, ConversionState } from "../types/conversion";

interface ConversionPageProps {
  kind: ConversionKind;
  title: string;
  lede: string;
  accept: string;
  supportedInfo: string;
  note?: string;
}

export function ConversionPage({ kind, title, lede, accept, supportedInfo, note }: ConversionPageProps) {
  const [state, setState] = useState<ConversionState>("IDLE");
  const [file, setFile] = useState<File | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const reset = () => {
    setState("IDLE");
    setFile(null);
    setUploadPercent(0);
    setResult(null);
    setError(null);
  };

  const handleFileSelected = async (selected: File) => {
    setFile(selected);
    setState("UPLOADING");
    setError(null);
    setUploadPercent(0);

    try {
      const conversionResult = await convertFile(
        kind,
        selected,
        (percent) => setUploadPercent(percent),
        () => setState("PROCESSING")
      );
      setResult(conversionResult);
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

      <h1>{title}</h1>
      <p className="lede">{lede}</p>

      {state === "IDLE" && (
        <FileUploader accept={accept} supportedInfo={supportedInfo} onFileSelected={handleFileSelected} />
      )}

      {(state === "UPLOADING" || state === "PROCESSING") && file && (
        <UploadProgress fileName={file.name} state={state} uploadPercent={uploadPercent} />
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

      {note && <p className="supported-info">{note}</p>}
    </div>
  );
}
