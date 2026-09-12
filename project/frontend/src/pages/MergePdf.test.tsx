import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

import { MergePdf } from "./MergePdf";

describe("MergePdf", () => {
  it("starts in IDLE, showing the multi-file dropzone", () => {
    render(
      <BrowserRouter>
        <MergePdf />
      </BrowserRouter>
    );

    expect(screen.getByText("Drop PDFs here")).toBeInTheDocument();
  });
});
