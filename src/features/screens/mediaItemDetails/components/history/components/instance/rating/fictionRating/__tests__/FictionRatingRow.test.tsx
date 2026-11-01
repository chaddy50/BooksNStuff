import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { MockInstance } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FictionRatingRow } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/fictionRating/FictionRatingRow";
import {
	installResizeObserverStub,
	stubComputedStyle,
	stubScrollHeight,
} from "#/tests/autoResize";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

let scrollHeightStub: ReturnType<typeof stubScrollHeight>;
let computedStyleSpy: MockInstance;

function renderFictionRatingRow(comment?: string) {
	const props = {
		title: "Plot",
		rating: 4,
		comment,
		updateRating: vi.fn(),
		updateComment: vi.fn(),
	};
	return { ...render(<FictionRatingRow {...props} />), props };
}

async function openCommentDialog() {
	const trigger = screen.queryByText("fictionRating.addComment");
	fireEvent.click(trigger ?? screen.getByRole("button", { name: "" }));
	return await screen.findByRole("textbox");
}

beforeEach(() => {
	scrollHeightStub = stubScrollHeight(0);
	computedStyleSpy = stubComputedStyle();
	installResizeObserverStub();
});

afterEach(() => {
	cleanup();
	scrollHeightStub.restore();
	computedStyleSpy.mockRestore();
});

describe("FictionRatingRow", () => {
	it("opens a comment dialog with an auto-resizing, focused textarea", async () => {
		renderFictionRatingRow();

		const textarea = await openCommentDialog();

		expect(textarea).toHaveAttribute("rows", "4");
		expect(textarea).toHaveClass("resize-none", "field-sizing-fixed");
		expect(document.activeElement).toBe(textarea);
	});

	it("clamps the dialog textarea at the tighter maxRows", async () => {
		scrollHeightStub.set(1000);
		renderFictionRatingRow();

		const textarea = await openCommentDialog();

		expect(textarea.style.height).toBe("306px");
		expect(textarea.style.overflowY).toBe("auto");
	});

	it("saves the edited draft", async () => {
		const { props } = renderFictionRatingRow();

		const textarea = await openCommentDialog();
		fireEvent.change(textarea, { target: { value: "Loved the ending" } });
		fireEvent.click(screen.getByText("mediaItemDetails.save"));

		expect(props.updateComment).toHaveBeenCalledWith("Loved the ending");
		expect(props.updateComment).toHaveBeenCalledTimes(1);
	});

	it("resets the draft to the current comment when reopened after a cancel", async () => {
		renderFictionRatingRow("original");

		const textarea = await openCommentDialog();
		fireEvent.change(textarea, { target: { value: "edited" } });
		fireEvent.click(screen.getByText("mediaItemDetails.cancel"));

		const reopened = await openCommentDialog();
		expect(reopened).toHaveValue("original");
	});

	it("gives the comment dialog an accessible description", async () => {
		renderFictionRatingRow();

		await openCommentDialog();

		expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
			"fictionRating.commentDescription",
		);
	});
});
