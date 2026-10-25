import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExpandableTextBlock } from "#/components/ExpandableTextBlock";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

beforeEach(() => {
	// jsdom never lays out, so scrollHeight/clientHeight default to 0 on every
	// element — stub them so the overflow check finds a reason to show the toggle.
	Object.defineProperty(HTMLParagraphElement.prototype, "scrollHeight", {
		configurable: true,
		get: () => 100,
	});
	Object.defineProperty(HTMLParagraphElement.prototype, "clientHeight", {
		configurable: true,
		get: () => 50,
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
});
