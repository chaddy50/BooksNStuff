import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MediaItemDetailsHeaderBackdrop } from "../MediaItemDetailsHeaderBackdrop";

afterEach(cleanup);

describe("MediaItemDetailsHeaderBackdrop", () => {
	it("renders its children", () => {
		render(
			<MediaItemDetailsHeaderBackdrop>
				<p>content</p>
			</MediaItemDetailsHeaderBackdrop>,
		);

		expect(screen.getByText("content")).toBeInTheDocument();
	});

	it("does not render a blurred cover-art image", () => {
		const { container } = render(
			<MediaItemDetailsHeaderBackdrop>
				<p>content</p>
			</MediaItemDetailsHeaderBackdrop>,
		);

		expect(container.querySelector("img")).not.toBeInTheDocument();
	});

	it("uses a plain theme-aware card background instead of a dark gradient overlay", () => {
		const { container } = render(
			<MediaItemDetailsHeaderBackdrop>
				<p>content</p>
			</MediaItemDetailsHeaderBackdrop>,
		);

		const root = container.firstChild as HTMLElement;
		expect(root).toHaveClass("bg-card");
		expect(
			container.querySelector(".bg-gradient-to-b"),
		).not.toBeInTheDocument();
	});
});
