import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InitialsAvatar } from "#/components/InitialsAvatar";

afterEach(cleanup);

describe("InitialsAvatar", () => {
	it("renders the first letter of the first and last name segments", () => {
		render(<InitialsAvatar name="N.K. Jemisin" />);
		expect(screen.getByText("NJ")).toBeInTheDocument();
	});

	it("renders the first letter of each word for a two-word name", () => {
		render(<InitialsAvatar name="Science Fiction" />);
		expect(screen.getByText("SF")).toBeInTheDocument();
	});

	it("renders the first two letters for a single-word name", () => {
		render(<InitialsAvatar name="Horror" />);
		expect(screen.getByText("HO")).toBeInTheDocument();
	});
});
