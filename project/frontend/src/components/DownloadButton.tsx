import { ConversionResult } from "../types/conversion";
import { triggerDownload } from "../services/api";

interface DownloadButtonProps {
  result: ConversionResult;
  onReset: () => void;
}

export function DownloadButton({ result, onReset }: DownloadButtonProps) {
  return (
    <div className="status-panel success-box">
      <p className="status-panel__file">Done — {result.filename}</p>
      <div className="button-row">
        <button className="button" onClick={() => triggerDownload(result)}>
          Download {result.filename}
        </button>
        <button className="button button--ghost" onClick={onReset}>
          Convert another
        </button>
      </div>
    </div>
  );
}
