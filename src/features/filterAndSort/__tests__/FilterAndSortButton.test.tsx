import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	countActiveFilters,
	FilterAndSortButton,
} from "#/features/filterAndSort/FilterAndSortButton";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
}));

vi.mock("#/features/filterAndSort/FilterAndSortDialog", () => ({
	FilterAndSortDialog: () => null,
}));

afterEach(cleanup);

describe("countActiveFilters", () => {
	it("returns 0 when no filters are set", () => {
		expect(countActiveFilters({})).toBe(0);
	});

	it("counts mediaTypes when set", () => {
		expect(countActiveFilters({ mediaTypes: ["book"] })).toBe(1);
	});

	it("counts statuses when set", () => {
		expect(countActiveFilters({ statuses: ["done"] })).toBe(1);
	});

	it("counts purchaseStatuses when set", () => {
		expect(countActiveFilters({ purchaseStatuses: ["purchased"] })).toBe(1);
	});

	it("counts completedThisYear as one filter", () => {
		expect(countActiveFilters({ completedThisYear: true })).toBe(1);
	});

	it("counts completedDateStart as one filter", () => {
		expect(countActiveFilters({ completedDateStart: "2024-01-01" })).toBe(1);
	});

	it("counts completedDateEnd as one filter", () => {
		expect(countActiveFilters({ completedDateEnd: "2024-12-31" })).toBe(1);
	});

	it("counts completedDateStart and completedDateEnd together as one filter", () => {
		expect(
			countActiveFilters({
				completedDateStart: "2024-01-01",
				completedDateEnd: "2024-12-31",
			}),
		).toBe(1);
	});

	it("counts tags when set", () => {
		expect(countActiveFilters({ tags: ["fiction"] })).toBe(1);
	});

	it("counts genres when set", () => {
		expect(countActiveFilters({ genres: ["horror"] })).toBe(1);
	});

	it("counts creatorQuery when set", () => {
		expect(countActiveFilters({ creatorQuery: "tolkien" })).toBe(1);
	});

	it("counts isSeriesComplete when set to true", () => {
		expect(countActiveFilters({ isSeriesComplete: true })).toBe(1);
	});

	it("counts isSeriesComplete when set to false", () => {
		expect(countActiveFilters({ isSeriesComplete: false })).toBe(1);
	});

	it("does not count sortBy", () => {
		expect(countActiveFilters({ sortBy: "title" })).toBe(0);
	});

	it("does not count sortDirection", () => {
		expect(countActiveFilters({ sortDirection: "desc" })).toBe(0);
	});

	it("accumulates multiple active filters", () => {
		expect(
			countActiveFilters({
				mediaTypes: ["book", "movie"],
				statuses: ["done"],
				tags: ["fiction"],
				genres: ["horror"],
				creatorQuery: "tolkien",
				sortDirection: "desc",
			}),
		).toBe(5);
	});
});

describe("FilterAndSortButton", () => {
	function renderButton(filterAndSortChoices = {}) {
		render(
			<FilterAndSortButton
				filterAndSortChoices={filterAndSortChoices}
				isFilterAndSortPopupOpen={false}
				setIsFilterAndSortPopupOpen={vi.fn()}
				navigateTo="/library"
			/>,
		);
	}

	it("grows the standalone filter button's tap target below md", () => {
		renderButton();

		expect(
			screen.getByText("library.filterAndSort").closest("button"),
		).toHaveClass("max-sm:size-11", "max-md:h-11");
	});

	it("grows the combined filter toggle and clear buttons' tap targets below md", () => {
		renderButton({ mediaTypes: ["book"] });

		const toggleButton = screen
			.getByText("library.filterAndSort")
			.closest("button");
		const clearButton = screen.getByLabelText("library.clearFilters");

		expect(toggleButton).toHaveClass("max-sm:size-11", "max-md:h-11");
		expect(clearButton).toHaveClass("max-md:size-11");
	});
});
