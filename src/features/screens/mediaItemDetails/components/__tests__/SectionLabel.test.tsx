import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SectionLabel } from "../SectionLabel";

afterEach(cleanup);

describe("SectionLabel", () => {
	it("renders its text as a heading", () => {
		render(<SectionLabel>History</SectionLabel>);

		expect(
			screen.getByRole("heading", { name: "History" }),
		).toBeInTheDocument();
	});

	it("renders larger than the sections' own text-sm body content", () => {
		render(<SectionLabel>History</SectionLabel>);

		const heading = screen.getByRole("heading", { name: "History" });

		expect(heading).toHaveClass("text-base");
		expect(heading).not.toHaveClass("text-xs", "text-sm");
	});
});
