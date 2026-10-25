import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InsightsScreen } from "#/features/screens/insights/InsightsScreen";
import type { InsightsReport } from "#/features/screens/reports/types";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
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

vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({
		useLoaderData: () => REPORTS,
	}),
	useNavigate: () => vi.fn(),
}));

vi.mock("#/features/navigation/topBar/TopBar", () => ({ TopBar: () => null }));

afterEach(cleanup);

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
});
