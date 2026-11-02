import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditSeriesDialog } from "#/features/screens/seriesDetails/components/EditSeriesDialog";
import type { SeriesDetails } from "#/features/screens/seriesDetails/seriesDetails";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: vi.fn() }),
}));

vi.mock("#/features/screens/seriesDetails/seriesDetails", () => ({
	updateSeriesMetadata: vi.fn(),
}));

const toast = vi.fn();
vi.mock("#/components/hooks/useToast", () => ({
	useToast: () => ({ toast }),
}));

const SERIES_DETAILS = {
	id: 1,
	name: "The Expanse",
	description: "A sprawling space opera.",
	isComplete: false,
} as unknown as SeriesDetails;

const seriesDetails = {
	id: 9,
	name: "The Expanse",
	description: "",
	isComplete: false,
} as unknown as SeriesDetails;

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("EditSeriesDialog", () => {
	it("gives the dialog an accessible description", () => {
		render(<EditSeriesDialog seriesDetails={SERIES_DETAILS} />);

		fireEvent.click(screen.getByLabelText("seriesDetails.edit"));

		expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
			"seriesDetails.editDescription",
		);
	});

	it("shows a destructive toast with the failure message and stays open when updateSeriesMetadata rejects", async () => {
		const { updateSeriesMetadata } = await import(
			"#/features/screens/seriesDetails/seriesDetails"
		);
		vi.mocked(updateSeriesMetadata).mockRejectedValue(
			new Error("Name already in use."),
		);

		render(<EditSeriesDialog seriesDetails={seriesDetails} />);
		fireEvent.click(screen.getByLabelText("seriesDetails.edit"));
		fireEvent.click(screen.getByText("common.save"));

		await waitFor(() =>
			expect(toast).toHaveBeenCalledWith("Name already in use.", {
				variant: "destructive",
			}),
		);
		expect(screen.getByText("seriesDetails.edit")).toBeInTheDocument();
	});
});
