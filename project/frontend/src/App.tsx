import { Route, Routes } from "react-router-dom";

import { Home } from "./pages/Home";
import { WordToPdf } from "./pages/WordToPdf";
import { PdfToWord } from "./pages/PdfToWord";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/word-to-pdf" element={<WordToPdf />} />
      <Route path="/pdf-to-word" element={<PdfToWord />} />
    </Routes>
  );
}
