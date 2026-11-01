import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditSeriesDialog } from "#/features/screens/seriesDetails/components/EditSeriesDialog";
import type { SeriesDetails } from "#/features/screens/seriesDetails/seriesDetails";

const translate = (key: string) => key;
vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: translate }),
}));

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: vi.fn() }),
}));

vi.mock("#/features/screens/seriesDetails/seriesDetails", () => ({
	updateSeriesMetadata: vi.fn(),
}));

const SERIES_DETAILS = {
	id: 1,
	name: "The Expanse",
	description: "A sprawling space opera.",
	isComplete: false,
} as unknown as SeriesDetails;

afterEach(cleanup);

describe("EditSeriesDialog", () => {
	it("gives the dialog an accessible description", () => {
		render(<EditSeriesDialog seriesDetails={SERIES_DETAILS} />);

		fireEvent.click(screen.getByLabelText("seriesDetails.edit"));

		expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
			"seriesDetails.editDescription",
		);
	});
});
