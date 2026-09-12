import { ConversionState } from "../types/conversion";

interface UploadProgressProps {
  fileName: string;
  state: ConversionState;
  uploadPercent: number;
  processingLabel?: string;
}

export function UploadProgress({
  fileName,
  state,
  uploadPercent,
  processingLabel = "Converting…",
}: UploadProgressProps) {
  const percent = state === "PROCESSING" ? 100 : uploadPercent;
  const stateLabel: Record<string, string> = {
    UPLOADING: "Uploading…",
    PROCESSING: processingLabel,
  };

  return (
    <div className="status-panel">
      <p className="status-panel__file">{fileName}</p>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="status-label">{stateLabel[state] ?? ""}</p>
    </div>
  );
}
