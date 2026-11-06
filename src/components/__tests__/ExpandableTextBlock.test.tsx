import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExpandableTextBlock } from "#/components/ExpandableTextBlock";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

let scrollHeight = 100;
let clientHeight = 50;

beforeEach(() => {
	scrollHeight = 100;
	clientHeight = 50;

	// jsdom never lays out, so scrollHeight/clientHeight default to 0 on every
	// element — stub them so the overflow check finds a reason to show the toggle.
	Object.defineProperty(HTMLParagraphElement.prototype, "scrollHeight", {
		configurable: true,
		get: () => scrollHeight,
	});
	Object.defineProperty(HTMLParagraphElement.prototype, "clientHeight", {
		configurable: true,
		get: () => clientHeight,
	});
});

afterEach(() => {
	cleanup();
	Reflect.deleteProperty(HTMLParagraphElement.prototype, "scrollHeight");
	Reflect.deleteProperty(HTMLParagraphElement.prototype, "clientHeight");
});

describe("ExpandableTextBlock", () => {
	it("right-aligns the show-more toggle, matching MarkdownTextBlock's review toggle", () => {
		render(<ExpandableTextBlock text="some long description" />);

		expect(screen.getByRole("button", { name: "common.showMore" })).toHaveClass(
			"ml-auto",
			"block",
		);
	});

	it("re-checks overflow when the text changes without a remount", () => {
		scrollHeight = 50;
		clientHeight = 50;
		const { rerender } = render(<ExpandableTextBlock text="short text" />);

		expect(
			screen.queryByRole("button", { name: "common.showMore" }),
		).not.toBeInTheDocument();

		scrollHeight = 100;
		rerender(<ExpandableTextBlock text="a much longer piece of text" />);

		expect(
			screen.getByRole("button", { name: "common.showMore" }),
		).toBeInTheDocument();
	});
});
