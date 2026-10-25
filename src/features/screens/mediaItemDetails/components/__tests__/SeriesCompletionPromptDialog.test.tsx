import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SeriesCompletionPromptDialog } from "#/features/screens/mediaItemDetails/components/SeriesCompletionPromptDialog";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const onMarkWaiting = vi.fn();
const onMarkComplete = vi.fn();

type DialogOverrides = {
	seriesName?: string | null;
	isResolving?: boolean;
};

function renderDialog(overrides: DialogOverrides = {}) {
	return render(
		<SeriesCompletionPromptDialog
			seriesName={
				"seriesName" in overrides
					? (overrides.seriesName ?? null)
					: "Ongoing Trilogy"
			}
			isResolving={overrides.isResolving ?? false}
			onMarkWaiting={onMarkWaiting}
			onMarkComplete={onMarkComplete}
		/>,
	);
}

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("SeriesCompletionPromptDialog", () => {
	it("renders when a seriesName is given", () => {
		renderDialog();

		expect(
			screen.getByText("seriesCompletionPrompt.markWaiting"),
		).toBeInTheDocument();
		expect(
			screen.getByText("seriesCompletionPrompt.markComplete"),
		).toBeInTheDocument();
	});

	it("renders nothing when seriesName is null", () => {
		renderDialog({ seriesName: null });

		expect(
			screen.queryByText("seriesCompletionPrompt.markWaiting"),
		).not.toBeInTheDocument();
	});

	it("calls onMarkWaiting when the waiting option is clicked", () => {
		renderDialog();

		fireEvent.click(screen.getByText("seriesCompletionPrompt.markWaiting"));

		expect(onMarkWaiting).toHaveBeenCalledTimes(1);
		expect(onMarkComplete).not.toHaveBeenCalled();
	});

	it("calls onMarkComplete when the complete option is clicked", () => {
		renderDialog();

		fireEvent.click(screen.getByText("seriesCompletionPrompt.markComplete"));

		expect(onMarkComplete).toHaveBeenCalledTimes(1);
		expect(onMarkWaiting).not.toHaveBeenCalled();
	});

	// Overlay clicks are not reproducible in jsdom (Radix uses pointer capture);
	// Escape exercises the same onOpenChange(false) path.
	it("treats dismissing the dialog as marking it waiting", () => {
		renderDialog();

		fireEvent.keyDown(document, { key: "Escape" });

		expect(onMarkWaiting).toHaveBeenCalledTimes(1);
		expect(onMarkComplete).not.toHaveBeenCalled();
	});

	it("disables both actions while resolving", () => {
		renderDialog({ isResolving: true });

		expect(
			screen.getByText("seriesCompletionPrompt.markWaiting"),
		).toBeDisabled();
		expect(
			screen.getByText("seriesCompletionPrompt.markComplete"),
		).toBeDisabled();
	});
});
