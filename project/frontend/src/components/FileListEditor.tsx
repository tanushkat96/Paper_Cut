import { formatFileSize } from "../utils/formatFileSize";

interface FileListEditorProps {
  files: File[];
  onReorder: (files: File[]) => void;
  onRemove: (index: number) => void;
  onClearAll: () => void;
}

/**
 * Shows the selected PDFs in merge order with up/down reordering and
 * per-item removal. The project has no drag-and-drop library, so reordering
 * uses explicit ↑/↓ controls (matches the spec's own wireframe) rather than
 * introducing a new dependency for this.
 */
export function FileListEditor({ files, onReorder, onRemove, onClearAll }: FileListEditorProps) {
  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...files];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onReorder(next);
  };

  const moveDown = (index: number) => {
    if (index === files.length - 1) return;
    const next = [...files];
    [next[index + 1], next[index]] = [next[index], next[index + 1]];
    onReorder(next);
  };

  return (
    <div className="file-list">
      {files.map((file, index) => (
        <div className="file-list__item" key={`${file.name}-${file.lastModified}-${index}`}>
          <span className="file-list__index">{index + 1}.</span>
          <div className="file-list__info">
            <p className="file-list__name">{file.name}</p>
            <p className="file-list__size">{formatFileSize(file.size)}</p>
          </div>
          <div className="file-list__controls">
            <button
              type="button"
              className="file-list__control-btn"
              onClick={() => moveUp(index)}
              disabled={index === 0}
              aria-label={`Move ${file.name} up`}
            >
              ↑
            </button>
            <button
              type="button"
              className="file-list__control-btn"
              onClick={() => moveDown(index)}
              disabled={index === files.length - 1}
              aria-label={`Move ${file.name} down`}
            >
              ↓
            </button>
            <button
              type="button"
              className="file-list__control-btn file-list__control-btn--remove"
              onClick={() => onRemove(index)}
              aria-label={`Remove ${file.name}`}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      <div className="file-list__footer">
        <span className="file-list__count">
          {files.length} file{files.length === 1 ? "" : "s"} — merged in this order
        </span>
        <button type="button" className="link-button" onClick={onClearAll}>
          Clear all
        </button>
      </div>
    </div>
  );
}
