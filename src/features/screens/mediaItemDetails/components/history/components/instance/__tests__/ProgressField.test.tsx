import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProgressField } from "#/features/screens/mediaItemDetails/components/history/components/instance/ProgressField";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

describe("ProgressField", () => {
	it("shows the progress input when completedAt is empty", () => {
		render(
			<ProgressField
				completedAt=""
				progressPercent="55"
				onProgressPercentChange={vi.fn()}
			/>,
		);

		expect(screen.getByLabelText("mediaItemDetails.progress")).toHaveValue(55);
	});

	it("renders nothing when completedAt is set", () => {
		render(
			<ProgressField
				completedAt="2024-01-15"
				progressPercent="55"
				onProgressPercentChange={vi.fn()}
			/>,
		);

		expect(
			screen.queryByLabelText("mediaItemDetails.progress"),
		).not.toBeInTheDocument();
	});

	it("calls onProgressPercentChange with the typed value", () => {
		const onProgressPercentChange = vi.fn();
		render(
			<ProgressField
				completedAt=""
				progressPercent=""
				onProgressPercentChange={onProgressPercentChange}
			/>,
		);

		fireEvent.change(screen.getByLabelText("mediaItemDetails.progress"), {
			target: { value: "30" },
		});

		expect(onProgressPercentChange).toHaveBeenCalledWith("30");
	});

	it("shows a page label and total-pages suffix when pageCount is given", () => {
		render(
			<ProgressField
				completedAt=""
				progressPercent="160"
				onProgressPercentChange={vi.fn()}
				pageCount={320}
			/>,
		);

		expect(screen.getByLabelText("mediaItemDetails.page")).toHaveValue(160);
		expect(screen.getByText("/ 320")).toBeInTheDocument();
	});

	it("uses the raw percent label and no suffix when pageCount is omitted", () => {
		render(
			<ProgressField
				completedAt=""
				progressPercent="55"
				onProgressPercentChange={vi.fn()}
			/>,
		);

		expect(screen.getByLabelText("mediaItemDetails.progress")).toHaveValue(55);
		expect(screen.queryByText(/^\//)).not.toBeInTheDocument();
	});
});
