import { Link } from "react-router-dom";

export function Home() {
  return (
    <div className="app-shell">
      <div className="brand">
        <span className="brand__mark">papercut</span>
      </div>

      <h1>Convert documents without the clutter.</h1>
      <p className="lede">
        Two conversions, done plainly: Word to PDF, and PDF back to Word. Nothing is stored —
        your file is deleted the moment the download finishes.
      </p>

      <div className="tool-grid">
        <Link to="/word-to-pdf" className="tool-card">
          <span className="tool-card__label">.doc / .docx → .pdf</span>
          <span className="tool-card__title">Word to PDF</span>
          <p className="tool-card__desc">Turn a Word document into a shareable, fixed-layout PDF.</p>
        </Link>
        <Link to="/pdf-to-word" className="tool-card">
          <span className="tool-card__label">.pdf → .docx</span>
          <span className="tool-card__title">PDF to Word</span>
          <p className="tool-card__desc">Pull the text out of a PDF into an editable Word file.</p>
        </Link>
         <Link to="/merge-pdf" className="tool-card">
          <span className="tool-card__label">multiple .pdf → one .pdf</span>
          <span className="tool-card__title">Merge PDF</span>
          <p className="tool-card__desc">Combine several PDFs into one, in the order you choose.</p>
        </Link>
        <Link to="/split-pdf" className="tool-card">
          <span className="tool-card__label">.pdf → .zip of .pdf</span>
          <span className="tool-card__title">Split PDF</span>
          <p className="tool-card__desc">Break a PDF apart by page, or by the ranges you set.</p>
        </Link>
      </div>
    </div>
  );
}
