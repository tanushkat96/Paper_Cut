import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

import { SplitPdf } from "./SplitPdf";

describe("SplitPdf", () => {
  it("starts in IDLE, showing the single-file dropzone", () => {
    render(
      <BrowserRouter>
        <SplitPdf />
      </BrowserRouter>
    );

    expect(screen.getByText("Drop your file here")).toBeInTheDocument();
  });
});
