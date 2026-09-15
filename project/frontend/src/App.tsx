import { Route, Routes } from "react-router-dom";

import { Home } from "./pages/Home";
import { WordToPdf } from "./pages/WordToPdf";
import { PdfToWord } from "./pages/PdfToWord";
import { MergePdf } from "./pages/MergePdf";
import { SplitPdf } from "./pages/SplitPdf";
import { CompressPdf } from "./pages/CompressPdf";
import { OrganizePdf } from "./pages/OrganizePdf";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/word-to-pdf" element={<WordToPdf />} />
      <Route path="/pdf-to-word" element={<PdfToWord />} />
      <Route path="/merge-pdf" element={<MergePdf />} />
      <Route path="/split-pdf" element={<SplitPdf />} />
      <Route path="/compress-pdf" element={<CompressPdf />} />
      <Route path="/organize-pdf" element={<OrganizePdf />} />
    </Routes>
  );
}
