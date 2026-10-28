import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GenreDataPoint } from "#/features/screens/reports/types";
import { buildGenrePieSegments, ReportChart } from "../ReportChart";

const navigateSpy = vi.fn();

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigateSpy,
}));

afterEach(() => {
	cleanup();
	navigateSpy.mockClear();
});

function genre(name: string, value: number): GenreDataPoint {
	return { genre: name, value };
}

describe("buildGenrePieSegments", () => {
	it("returns one segment per genre, unchanged, when there are 5 or fewer genres", () => {
		const genreData = [
			genre("Fantasy", 10),
			genre("Sci-Fi", 8),
			genre("Mystery", 5),
		];

		const segments = buildGenrePieSegments(genreData, "Other");

		expect(segments).toEqual([
			{ label: "Fantasy", value: 10, genreNames: ["Fantasy"], isOther: false },
			{ label: "Sci-Fi", value: 8, genreNames: ["Sci-Fi"], isOther: false },
			{ label: "Mystery", value: 5, genreNames: ["Mystery"], isOther: false },
		]);
	});

	it("groups genres beyond the top 5 into a single Other segment", () => {
		const genreData = [
			genre("Fantasy", 10),
			genre("Sci-Fi", 9),
			genre("Mystery", 8),
			genre("Romance", 7),
			genre("Horror", 6),
			genre("History", 3),
			genre("Poetry", 1),
		];

		const segments = buildGenrePieSegments(genreData, "Other");

		expect(segments).toHaveLength(6);
		expect(segments.slice(0, 5)).toEqual([
			{ label: "Fantasy", value: 10, genreNames: ["Fantasy"], isOther: false },
			{ label: "Sci-Fi", value: 9, genreNames: ["Sci-Fi"], isOther: false },
			{ label: "Mystery", value: 8, genreNames: ["Mystery"], isOther: false },
			{ label: "Romance", value: 7, genreNames: ["Romance"], isOther: false },
			{ label: "Horror", value: 6, genreNames: ["Horror"], isOther: false },
		]);
		expect(segments[5]).toEqual({
			label: "Other",
			value: 4,
			genreNames: ["History", "Poetry"],
			isOther: true,
		});
	});
});

describe("ReportChart legend (items_completed_by_genre)", () => {
	function sevenGenreData(): GenreDataPoint[] {
		return [
			genre("Fantasy", 10),
			genre("Sci-Fi", 9),
			genre("Mystery", 8),
			genre("Romance", 7),
			genre("Horror", 6),
			genre("History", 3),
			genre("Poetry", 1),
		];
	}

	function fourGenreData(): GenreDataPoint[] {
		return [
			genre("Fantasy", 10),
			genre("Sci-Fi", 9),
			genre("Mystery", 8),
			genre("Romance", 7),
		];
	}

	it("caps the legend to 5 named genres plus Other when there are more than 5", () => {
		render(
			<ReportChart
				reportType="items_completed_by_genre"
				data={sevenGenreData()}
			/>,
		);

		const buttons = screen.getAllByRole("button");

		expect(buttons.map((button) => button.textContent)).toEqual([
			"Fantasy",
			"Sci-Fi",
			"Mystery",
			"Romance",
			"Horror",
			"insights.report.other",
		]);
	});

	it("shows one legend entry per genre when there are 5 or fewer", () => {
		render(
			<ReportChart
				reportType="items_completed_by_genre"
				data={fourGenreData()}
			/>,
		);

		expect(screen.getAllByRole("button")).toHaveLength(4);
	});

	it("clicking a named legend entry navigates with that genre as both key and genres", () => {
		render(
			<ReportChart
				reportType="items_completed_by_genre"
				data={sevenGenreData()}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Fantasy" }));

		expect(navigateSpy).toHaveBeenCalledWith({
			to: "/reports/$reportType/drilldown",
			params: { reportType: "items_completed_by_genre" },
			search: { key: "Fantasy", genres: ["Fantasy"] },
		});
	});

	it("clicking the Other legend entry navigates with every grouped genre name", () => {
		render(
			<ReportChart
				reportType="items_completed_by_genre"
				data={sevenGenreData()}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: "insights.report.other" }),
		);

		expect(navigateSpy).toHaveBeenCalledWith({
			to: "/reports/$reportType/drilldown",
			params: { reportType: "items_completed_by_genre" },
			search: {
				key: "insights.report.other",
				genres: ["History", "Poetry"],
			},
		});
	});
});
