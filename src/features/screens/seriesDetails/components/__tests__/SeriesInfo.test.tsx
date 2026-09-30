import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#/components/ui/tooltip";
import { SeriesInfo } from "#/features/screens/seriesDetails/components/SeriesInfo";
import type { SeriesDetails } from "#/features/screens/seriesDetails/seriesDetails";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: vi.fn() }),
	Link: ({ children }: { children: React.ReactNode }) => (
		<a href="/">{children}</a>
	),
}));

// Keeps the server functions out of jsdom.
vi.mock("#/features/screens/seriesDetails/seriesDetails", () => ({
	updateSeriesStatus: vi.fn(),
	updateNextItemStatus: vi.fn(),
}));

vi.mock("#/features/screens/seriesDetails/components/EditSeriesDialog", () => ({
	EditSeriesDialog: () => <div data-testid="edit-series-dialog" />,
}));

/**
 * `SeriesDetails` is derived from the loader's return type, so the fixture is
 * cast rather than spelling out every column the component never reads.
 */
function buildSeriesDetails(overrides: Partial<SeriesDetails> = {}) {
	return {
		id: 12,
		name: "The Expanse",
		type: MediaItemType.BOOK,
		status: MediaItemStatus.COMPLETED,
		rating: 3.6,
		description: null,
		isComplete: true,
		nextItemStatus: null,
		items: [],
		...overrides,
	} as SeriesDetails;
}

function renderSeriesInfo(overrides: Partial<SeriesDetails> = {}) {
	return render(
		<TooltipProvider>
			<SeriesInfo seriesDetails={buildSeriesDetails(overrides)} />
		</TooltipProvider>,
	);
}

afterEach(cleanup);

describe("SeriesInfo", () => {
	it("shows the exact series rating next to its stars", () => {
		renderSeriesInfo();

		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
		expect(screen.getByText("3.6")).toBeInTheDocument();
	});

	it("hides the rating row for a dropped series", () => {
		renderSeriesInfo({ status: MediaItemStatus.DROPPED });

		expect(screen.queryByTestId("rating-stars")).not.toBeInTheDocument();
	});

	it("shows the latest completedAt across items, not the last item in series order", () => {
		renderSeriesInfo({
			items: [
				{ status: MediaItemStatus.COMPLETED, completedAt: "2026-06-01" },
				{ status: MediaItemStatus.COMPLETED, completedAt: "2026-08-15" },
				{ status: MediaItemStatus.COMPLETED, completedAt: "2026-01-10" },
			] as SeriesDetails["items"],
		});

		expect(screen.getByText("mediaItemDetails.completed")).toBeInTheDocument();
		expect(screen.getByText("Aug 15, 2026")).toBeInTheDocument();
	});
});
