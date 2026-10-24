import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteConfirmationDialog } from "#/components/DeleteConfirmationDialog";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const onCancel = vi.fn();
const onConfirm = vi.fn();

type DialogOverrides = {
	isOpen?: boolean;
	isDeleting?: boolean;
	errorMessage?: string;
};

function renderDialog(overrides: DialogOverrides = {}) {
	return render(
		<DeleteConfirmationDialog
			isOpen={overrides.isOpen ?? true}
			title="Delete this item?"
			description="Remove it from your library."
			isDeleting={overrides.isDeleting ?? false}
			errorMessage={overrides.errorMessage}
			onCancel={onCancel}
			onConfirm={onConfirm}
		/>,
	);
}

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("DeleteConfirmationDialog", () => {
	it("renders the given title and description when open", () => {
		renderDialog();

		expect(screen.getByText("Delete this item?")).toBeInTheDocument();
		expect(
			screen.getByText("Remove it from your library."),
		).toBeInTheDocument();
	});

	it("renders nothing when closed", () => {
		renderDialog({ isOpen: false });

		expect(screen.queryByText("Delete this item?")).not.toBeInTheDocument();
	});

	it("calls onCancel when Cancel is clicked", () => {
		renderDialog();

		fireEvent.click(screen.getByText("common.cancel"));

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("calls onConfirm when the confirm button is clicked", () => {
		renderDialog();

		fireEvent.click(screen.getByText("common.confirmDelete"));

		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onCancel).not.toHaveBeenCalled();
	});

	// Overlay clicks are not reproducible in jsdom (Radix uses pointer capture);
	// Escape exercises the same onOpenChange(false) path.
	it("treats dismissing the dialog as a cancel", () => {
		renderDialog();

		fireEvent.keyDown(document, { key: "Escape" });

		expect(onCancel).toHaveBeenCalled();
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("disables both actions and shows the deleting label while deleting", () => {
		renderDialog({ isDeleting: true });

		const cancelButton = screen.getByText("common.cancel");
		const confirmButton = screen.getByText("common.deleting");
		expect(cancelButton).toBeDisabled();
		expect(confirmButton).toBeDisabled();
		expect(screen.queryByText("common.confirmDelete")).not.toBeInTheDocument();

		fireEvent.click(confirmButton);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("renders the error message with an alert role when provided", () => {
		renderDialog({ errorMessage: "Couldn't delete this item." });

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Couldn't delete this item.",
		);
	});

	it("renders no alert when no error message is provided", () => {
		renderDialog();

		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
});
