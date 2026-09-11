import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

import { Home } from "./Home";

describe("Home", () => {
  it("renders both conversion tools", () => {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );

    expect(screen.getByText("Word to PDF")).toBeInTheDocument();
    expect(screen.getByText("PDF to Word")).toBeInTheDocument();
  });
});
