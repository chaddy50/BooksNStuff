import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InsightsScreen } from "#/features/screens/insights/InsightsScreen";
import type { InsightsReport } from "#/features/screens/reports/types";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const labels: Record<string, string> = {
				"insights.dateRange.presets.thisMonth": "This month",
				"insights.dateRange.presets.lastMonth": "Last month",
				"insights.dateRange.presets.last3Months": "Last 3 months",
				"insights.dateRange.presets.last6Months": "Last 6 months",
				"insights.dateRange.presets.last12Months": "Last 12 months",
				"insights.dateRange.presets.yearToDate": "Year to date",
				"insights.dateRange.apply": "Apply",
				"insights.dateRange.label": "Date range",
				"insights.itemTypeFilter.label": "Filter by type",
				"mediaType.book": "Book",
				"mediaType.movie": "Movie",
				"mediaType.tv_show": "TV Show",
				"mediaType.video_game": "Video Game",
				"mediaType.podcast": "Podcast",
				"library.clearFilters": "Clear filters",
				"views.form.dateFrom": "From",
				"views.form.dateTo": "To",
			};
			return labels[key] ?? key;
		},
	}),
}));

const REPORTS: InsightsReport[] = [
	{
		reportType: "items_completed_by_month",
		data: [{ month: "2026-01", value: 2 }],
	},
	{
		reportType: "items_completed_by_genre",
		data: [{ genre: "Fantasy", value: 3 }],
	},
	{
		reportType: "avg_score_by_genre",
		data: [{ genre: "Fantasy", value: 4, count: 5 }],
	},
	{ reportType: "progress_by_month", data: [{ month: "2026-01", value: 10 }] },
];

const SEARCH: { startDate?: string; endDate?: string; itemTypes?: string[] } =
	{};
let loaderItemTypes: string[] = [];
const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({
		useLoaderData: () => ({ reports: REPORTS, itemTypes: loaderItemTypes }),
		useSearch: () => SEARCH,
	}),
	useNavigate: () => navigate,
}));

vi.mock("#/features/navigation/topBar/TopBar", () => ({
	TopBar: ({ right }: { right?: React.ReactNode }) => right ?? null,
}));

const updateUserSettings = vi.fn().mockResolvedValue(undefined);

vi.mock("#/features/screens/settings/settings", () => ({
	updateUserSettings: (...args: unknown[]) => updateUserSettings(...args),
}));

function renderInsightsScreen() {
	const queryClient = new QueryClient();
	return render(
		<QueryClientProvider client={queryClient}>
			<InsightsScreen />
		</QueryClientProvider>,
	);
}

afterEach(() => {
	cleanup();
	navigate.mockClear();
	updateUserSettings.mockClear();
	SEARCH.startDate = undefined;
	SEARCH.endDate = undefined;
	SEARCH.itemTypes = undefined;
	loaderItemTypes = [];
	vi.useRealTimers();
});

describe("InsightsScreen", () => {
	it("renders all four report tiles in the fixed order", () => {
		renderInsightsScreen();

		const headings = screen.getAllByRole("heading", { level: 2 });
		expect(headings.map((h) => h.textContent)).toEqual([
			"insights.report.itemsCompletedByMonth",
			"insights.report.itemsCompletedByGenre",
			"insights.report.avgScoreByGenre",
			"insights.report.progressByMonth",
		]);
	});

	it("shows Year to date as the active preset by default", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		renderInsightsScreen();

		fireEvent.click(screen.getByRole("button", { name: "Year to date" }));

		expect(
			screen.getAllByRole("button", { name: "Year to date" })[1],
		).toHaveClass("bg-accent");
	});

	it("navigates to /insights with the applied range from the date range picker, preserving other search params", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		SEARCH.itemTypes = ["book"];
		renderInsightsScreen();

		fireEvent.click(screen.getByRole("button", { name: "Year to date" }));
		fireEvent.click(screen.getByRole("button", { name: "Last 3 months" }));
		fireEvent.click(screen.getByRole("button", { name: "Apply" }));

		expect(navigate).toHaveBeenCalledWith({
			to: "/insights",
			search: expect.any(Function),
		});
		const searchUpdater = navigate.mock.calls[0][0].search;
		expect(searchUpdater(SEARCH)).toEqual({
			itemTypes: ["book"],
			startDate: "2026-07-31",
			endDate: "2026-10-31",
		});
	});

	it("renders the item type filter with the effective selection from the loader", () => {
		loaderItemTypes = ["book"];
		renderInsightsScreen();

		expect(screen.getByRole("button", { name: "Book" })).toBeInTheDocument();
	});

	it("toggling an item type navigates with the updated selection and persists it as the default", () => {
		loaderItemTypes = ["book"];
		renderInsightsScreen();

		fireEvent.click(screen.getByRole("button", { name: "Book" }));
		fireEvent.click(screen.getByRole("button", { name: "Movie" }));

		expect(navigate).toHaveBeenCalledWith({
			to: "/insights",
			search: expect.any(Function),
		});
		const searchUpdater = navigate.mock.calls[0][0].search;
		expect(searchUpdater(SEARCH)).toEqual({
			itemTypes: ["book", "movie"],
		});
		expect(updateUserSettings).toHaveBeenCalledWith({
			data: { defaultInsightsItemTypes: ["book", "movie"] },
		});
	});

	it("deselecting a type navigates with it removed and persists the narrowed selection", () => {
		loaderItemTypes = ["book", "movie"];
		renderInsightsScreen();

		fireEvent.click(screen.getByRole("button", { name: "Book, Movie" }));
		fireEvent.click(screen.getByRole("button", { name: "Book" }));

		const searchUpdater = navigate.mock.calls[0][0].search;
		expect(searchUpdater(SEARCH)).toEqual({ itemTypes: ["movie"] });
		expect(updateUserSettings).toHaveBeenCalledWith({
			data: { defaultInsightsItemTypes: ["movie"] },
		});
	});

	it("clicking the clear button navigates with no item types and persists an empty default", () => {
		loaderItemTypes = ["book", "movie"];
		renderInsightsScreen();

		fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

		const searchUpdater = navigate.mock.calls[0][0].search;
		expect(searchUpdater(SEARCH)).toEqual({ itemTypes: [] });
		expect(updateUserSettings).toHaveBeenCalledWith({
			data: { defaultInsightsItemTypes: [] },
		});
	});
});
