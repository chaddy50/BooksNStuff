import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MediaItemDetailsHeaderTags } from "../MediaItemDetailsHeaderTags";

afterEach(cleanup);

describe("MediaItemDetailsHeaderTags", () => {
	it("renders each tag's text", () => {
		render(<MediaItemDetailsHeaderTags tags={["favorite", "cozy"]} />);

		expect(screen.getByText("favorite")).toBeInTheDocument();
		expect(screen.getByText("cozy")).toBeInTheDocument();
	});

	it("uses theme-aware secondary colors instead of a hardcoded white tint", () => {
		render(<MediaItemDetailsHeaderTags tags={["favorite"]} />);

		const tag = screen.getByText("favorite");
		expect(tag).toHaveClass("bg-secondary", "text-secondary-foreground");
		expect(tag).not.toHaveClass("bg-white/15", "text-white");
	});

	it("renders nothing when there are no tags", () => {
		const { container } = render(<MediaItemDetailsHeaderTags tags={[]} />);

		expect(container).toBeEmptyDOMElement();
	});
});
