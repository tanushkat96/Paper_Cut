import { ConversionPage } from "../components/ConversionPage";

export function PdfToWord() {
  return (
    <ConversionPage
      kind="pdf-to-word"
      title="PDF to Word"
      lede="Upload a text-based PDF and get back an editable .docx of its content."
      accept=".pdf"
      supportedInfo="Accepts .pdf, up to 25 MB. Scanned PDFs without selectable text aren't supported yet."
      note="Note: tables, columns, and images aren't preserved — this pulls out text content only."
    />
  );
}
