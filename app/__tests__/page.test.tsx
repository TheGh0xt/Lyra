// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LandingPage from "../page";

/**
 * L2/L5 (2026-09-17): the landing page was reachable only by guessing a URL
 * — no link to `/login` existed anywhere, and the footer's contact address
 * pointed at a domain nobody owns.
 */
describe("LandingPage", () => {
  it("links to sign-in from the header, for a visitor who's already invited", () => {
    render(<LandingPage />);

    const signInLinks = screen.getAllByRole("link", { name: /sign in/i });
    expect(signInLinks.length).toBeGreaterThan(0);
    for (const link of signInLinks) {
      expect(link).toHaveAttribute("href", "/login");
    }
  });

  it("tells an already-invited visitor how to sign in, next to the waitlist form", () => {
    render(<LandingPage />);

    expect(screen.getByText(/already invited\?/i)).toBeInTheDocument();
  });

  it("points contact at a real, owned address", () => {
    render(<LandingPage />);

    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute(
      "href",
      "mailto:apexchaos@duck.com",
    );
  });
});
