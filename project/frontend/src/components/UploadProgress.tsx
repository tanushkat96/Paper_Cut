import { ConversionState } from "../types/conversion";

interface UploadProgressProps {
  fileName: string;
  state: ConversionState;
  uploadPercent: number;
}

const STATE_LABEL: Record<string, string> = {
  UPLOADING: "Uploading…",
  PROCESSING: "Converting…",
};

export function UploadProgress({ fileName, state, uploadPercent }: UploadProgressProps) {
  const percent = state === "PROCESSING" ? 100 : uploadPercent;

  return (
    <div className="status-panel">
      <p className="status-panel__file">{fileName}</p>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="status-label">{STATE_LABEL[state] ?? ""}</p>
    </div>
  );
}
