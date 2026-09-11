import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

import { ConversionPage } from "./ConversionPage";

describe("ConversionPage", () => {
  it("starts in the IDLE state, showing the dropzone", () => {
    render(
      <BrowserRouter>
        <ConversionPage
          kind="word-to-pdf"
          title="Word to PDF"
          lede="Test lede"
          accept=".docx"
          supportedInfo="Accepts .docx, up to 25 MB."
        />
      </BrowserRouter>
    );

    expect(screen.getByText("Drop your file here")).toBeInTheDocument();
  });
});
