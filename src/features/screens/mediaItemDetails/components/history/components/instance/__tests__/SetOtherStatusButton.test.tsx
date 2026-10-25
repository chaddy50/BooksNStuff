import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SetOtherStatusButton } from "#/features/screens/mediaItemDetails/components/history/components/instance/SetOtherStatusButton";
import { MediaItemStatus } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const onConfirmStatus = vi.fn();

function renderButton(
	overrides: {
		disabled?: boolean;
		errorMessage?: string;
		status?: MediaItemStatus;
	} = {},
) {
	return render(
		<SetOtherStatusButton
			disabled={overrides.disabled ?? false}
			errorMessage={overrides.errorMessage}
			status={overrides.status ?? MediaItemStatus.IN_PROGRESS}
			onConfirmStatus={onConfirmStatus}
		/>,
	);
}

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("SetOtherStatusButton", () => {
	it("opens a confirmation dialog with both status choices when clicked", () => {
		renderButton();

		expect(
			screen.queryByText("mediaItemDetails.setOtherStatusDescription"),
		).not.toBeInTheDocument();

		fireEvent.click(screen.getByText("mediaItemDetails.setOtherStatus"));

		expect(
			screen.getByText("mediaItemDetails.setOtherStatusDescription"),
		).toBeInTheDocument();
		expect(screen.getByText("common.cancel")).toBeInTheDocument();
		expect(screen.getByText("status.on_hold")).toBeInTheDocument();
		expect(screen.getByText("status.dropped")).toBeInTheDocument();
	});

	it("closes the dialog without confirming a status when Cancel is clicked", () => {
		renderButton();
		fireEvent.click(screen.getByText("mediaItemDetails.setOtherStatus"));

		fireEvent.click(screen.getByText("common.cancel"));

		expect(
			screen.queryByText("mediaItemDetails.setOtherStatusDescription"),
		).not.toBeInTheDocument();
		expect(onConfirmStatus).not.toHaveBeenCalled();
	});

	it("calls onConfirmStatus with MediaItemStatus.ON_HOLD when On Hold is clicked", () => {
		renderButton();
		fireEvent.click(screen.getByText("mediaItemDetails.setOtherStatus"));

		fireEvent.click(screen.getByText("status.on_hold"));

		expect(onConfirmStatus).toHaveBeenCalledTimes(1);
		expect(onConfirmStatus).toHaveBeenCalledWith("on_hold");
	});

	it("calls onConfirmStatus with MediaItemStatus.DROPPED when Dropped is clicked", () => {
		renderButton();
		fireEvent.click(screen.getByText("mediaItemDetails.setOtherStatus"));

		fireEvent.click(screen.getByText("status.dropped"));

		expect(onConfirmStatus).toHaveBeenCalledTimes(1);
		expect(onConfirmStatus).toHaveBeenCalledWith("dropped");
	});

	it("disables the trigger so it cannot be opened while disabled", () => {
		renderButton({ disabled: true });

		expect(screen.getByText("mediaItemDetails.setOtherStatus")).toBeDisabled();

		fireEvent.click(screen.getByText("mediaItemDetails.setOtherStatus"));

		expect(
			screen.queryByText("mediaItemDetails.setOtherStatusDescription"),
		).not.toBeInTheDocument();
	});

	it("renders the error message with an alert role when provided", () => {
		renderButton({ errorMessage: "Couldn't update the status." });
		fireEvent.click(screen.getByText("mediaItemDetails.setOtherStatus"));

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Couldn't update the status.",
		);
	});

	it("renders no alert when no error message is provided", () => {
		renderButton();
		fireEvent.click(screen.getByText("mediaItemDetails.setOtherStatus"));

		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});

	it("shows a Resume button instead of Set Other Status while on hold", () => {
		renderButton({ status: MediaItemStatus.ON_HOLD });

		expect(screen.getByText("mediaItemDetails.resume")).toBeInTheDocument();
		expect(
			screen.queryByText("mediaItemDetails.setOtherStatus"),
		).not.toBeInTheDocument();
	});

	it("calls onConfirmStatus with MediaItemStatus.IN_PROGRESS when Resume is clicked", () => {
		renderButton({ status: MediaItemStatus.ON_HOLD });

		fireEvent.click(screen.getByText("mediaItemDetails.resume"));

		expect(onConfirmStatus).toHaveBeenCalledTimes(1);
		expect(onConfirmStatus).toHaveBeenCalledWith("in_progress");
	});

	it("disables the Resume button while disabled", () => {
		renderButton({ status: MediaItemStatus.ON_HOLD, disabled: true });

		expect(screen.getByText("mediaItemDetails.resume")).toBeDisabled();
	});

	it("shows the error message next to Resume without needing a dialog", () => {
		renderButton({
			status: MediaItemStatus.ON_HOLD,
			errorMessage: "Couldn't update the status.",
		});

		expect(screen.getByRole("alert")).toHaveTextContent(
			"Couldn't update the status.",
		);
	});

	it("shows a Resume button instead of Set Other Status while dropped", () => {
		renderButton({ status: MediaItemStatus.DROPPED });

		expect(screen.getByText("mediaItemDetails.resume")).toBeInTheDocument();
		expect(
			screen.queryByText("mediaItemDetails.setOtherStatus"),
		).not.toBeInTheDocument();
	});

	it("calls onConfirmStatus with MediaItemStatus.IN_PROGRESS when resuming a dropped item", () => {
		renderButton({ status: MediaItemStatus.DROPPED });

		fireEvent.click(screen.getByText("mediaItemDetails.resume"));

		expect(onConfirmStatus).toHaveBeenCalledTimes(1);
		expect(onConfirmStatus).toHaveBeenCalledWith("in_progress");
	});
});
