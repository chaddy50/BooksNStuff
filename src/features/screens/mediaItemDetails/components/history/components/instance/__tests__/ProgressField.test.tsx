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
});
