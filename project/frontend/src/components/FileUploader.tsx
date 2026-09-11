import { useRef, useState } from "react";

interface FileUploaderProps {
  accept: string;
  supportedInfo: string;
  onFileSelected: (file: File) => void;
}

export function FileUploader({ accept, supportedInfo, onFileSelected }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (files && files.length > 0) {
      onFileSelected(files[0]);
    }
  };

  return (
    <div>
      <div
        className={`dropzone ${isDragActive ? "dropzone--active" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <p className="dropzone__title">Drop your file here</p>
        <p className="dropzone__hint">or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      <p className="supported-info">{supportedInfo}</p>
    </div>
  );
}
