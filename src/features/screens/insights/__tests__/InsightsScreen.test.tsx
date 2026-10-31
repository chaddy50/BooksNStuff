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
	{ reportType: "avg_score_by_genre", data: [{ genre: "Fantasy", value: 4 }] },
	{ reportType: "progress_by_month", data: [{ month: "2026-01", value: 10 }] },
];

const SEARCH: { startDate?: string; endDate?: string } = {};
const navigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({
		useLoaderData: () => REPORTS,
		useSearch: () => SEARCH,
	}),
	useNavigate: () => navigate,
}));

vi.mock("#/features/navigation/topBar/TopBar", () => ({
	TopBar: ({ right }: { right?: React.ReactNode }) => right ?? null,
}));

afterEach(() => {
	cleanup();
	navigate.mockClear();
	SEARCH.startDate = undefined;
	SEARCH.endDate = undefined;
	vi.useRealTimers();
});

describe("InsightsScreen", () => {
	it("renders all four report tiles in the fixed order", () => {
		render(<InsightsScreen />);

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
		render(<InsightsScreen />);

		fireEvent.click(screen.getByRole("button", { name: "Year to date" }));

		expect(
			screen.getAllByRole("button", { name: "Year to date" })[1],
		).toHaveClass("bg-accent");
	});

	it("navigates to /insights with the applied range from the date range picker", () => {
		vi.setSystemTime(new Date("2026-10-31T12:00:00Z"));
		render(<InsightsScreen />);

		fireEvent.click(screen.getByRole("button", { name: "Year to date" }));
		fireEvent.click(screen.getByRole("button", { name: "Last 3 months" }));
		fireEvent.click(screen.getByRole("button", { name: "Apply" }));

		expect(navigate).toHaveBeenCalledWith({
			to: "/insights",
			search: { startDate: "2026-07-31", endDate: "2026-10-31" },
		});
	});
});
