import { ConversionPage } from "../components/ConversionPage";

export function WordToPdf() {
  return (
    <ConversionPage
      kind="word-to-pdf"
      title="Word to PDF"
      lede="Upload a .doc or .docx file and get back a PDF with the layout preserved."
      accept=".doc,.docx"
      supportedInfo="Accepts .doc and .docx, up to 25 MB."
    />
  );
}
