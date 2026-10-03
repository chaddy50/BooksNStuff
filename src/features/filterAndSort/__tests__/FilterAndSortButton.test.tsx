import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	countActiveFilters,
	FilterAndSortButton,
} from "#/features/filterAndSort/FilterAndSortButton";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const navigateSpy = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigateSpy,
}));

let capturedDialogProps: Record<string, unknown> | undefined;
vi.mock("#/features/filterAndSort/FilterAndSortDialog", () => ({
	FilterAndSortDialog: (props: Record<string, unknown>) => {
		capturedDialogProps = props;
		return null;
	},
}));

afterEach(() => {
	navigateSpy.mockClear();
	capturedDialogProps = undefined;
	cleanup();
});

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

describe("FilterAndSortButton overlay on saved filters", () => {
	function renderButton(
		props: Partial<ComponentProps<typeof FilterAndSortButton>> = {},
	) {
		render(
			<FilterAndSortButton
				filterAndSortChoices={{}}
				isFilterAndSortPopupOpen={false}
				setIsFilterAndSortPopupOpen={vi.fn()}
				navigateTo="/views/$viewId"
				{...props}
			/>,
		);
	}

	it("forwards path params to navigate when applying", () => {
		renderButton({ params: { viewId: "7" } });

		(capturedDialogProps?.onApply as (filters: object) => void)({
			tags: ["Fiction"],
		});

		expect(navigateSpy).toHaveBeenCalledWith(
			expect.objectContaining({ params: { viewId: "7" } }),
		);
	});

	it("forwards path params to navigate when clearing", () => {
		renderButton({
			params: { viewId: "7" },
			filterAndSortChoices: { tags: ["Fiction"] },
		});

		screen.getByLabelText("library.clearFilters").click();

		expect(navigateSpy).toHaveBeenCalledWith(
			expect.objectContaining({ params: { viewId: "7" } }),
		);
	});

	it("keeps sortBy and sortDirection when applying an overlay on saved filters", () => {
		renderButton({ isOverlayOnSavedFilters: true });

		(capturedDialogProps?.onApply as (filters: object) => void)({
			tags: ["Fiction"],
			sortBy: "rating",
			sortDirection: "desc",
		});

		const [[call]] = navigateSpy.mock.calls;
		expect(call.search()).toEqual({
			tags: ["Fiction"],
			sortBy: "rating",
			sortDirection: "desc",
			titleQuery: undefined,
		});
	});

	it("preserves the current title search when applying an overlay on saved filters", () => {
		renderButton({
			isOverlayOnSavedFilters: true,
			filterAndSortChoices: { titleQuery: "dune" },
		});

		(capturedDialogProps?.onApply as (filters: object) => void)({
			tags: ["Fiction"],
			sortBy: "rating",
			sortDirection: "desc",
		});

		const [[call]] = navigateSpy.mock.calls;
		expect(call.search()).toEqual({
			tags: ["Fiction"],
			sortBy: "rating",
			sortDirection: "desc",
			titleQuery: "dune",
		});
	});

	// Library/Series have no saved state to preserve a title search against, so
	// applying a filter there keeps replacing the whole search verbatim.
	it("does not preserve the title search when applying without isOverlayOnSavedFilters", () => {
		renderButton({ filterAndSortChoices: { titleQuery: "dune" } });

		(capturedDialogProps?.onApply as (filters: object) => void)({
			tags: ["Fiction"],
		});

		const [[call]] = navigateSpy.mock.calls;
		expect(call.search()).toEqual({ tags: ["Fiction"] });
	});

	// The bug this guards: clearing a view's overlay must drop a temporary sort
	// override too, so the view falls back to its own saved sort — not whatever
	// sort happened to be active when "clear" was clicked.
	it("clears sort along with filters when isOverlayOnSavedFilters is true", () => {
		renderButton({
			isOverlayOnSavedFilters: true,
			filterAndSortChoices: {
				tags: ["Fiction"],
				titleQuery: "dune",
				sortBy: "rating",
				sortDirection: "desc",
			},
		});

		screen.getByLabelText("library.clearFilters").click();

		const [[call]] = navigateSpy.mock.calls;
		expect(call.search()).toEqual({ titleQuery: "dune" });
	});

	// Library/Series have no saved sort to fall back to, so clearing filters
	// there keeps whatever sort is currently selected.
	it("keeps the current sort when clearing without isOverlayOnSavedFilters", () => {
		renderButton({
			filterAndSortChoices: {
				tags: ["Fiction"],
				titleQuery: "dune",
				sortBy: "rating",
				sortDirection: "desc",
			},
		});

		screen.getByLabelText("library.clearFilters").click();

		const [[call]] = navigateSpy.mock.calls;
		expect(call.search()).toEqual({
			sortBy: "rating",
			sortDirection: "desc",
			titleQuery: "dune",
		});
	});

	it("uses activeFilterCount instead of counting filterAndSortChoices when provided", () => {
		renderButton({
			filterAndSortChoices: { tags: ["Fiction"], genres: ["Horror"] },
			activeFilterCount: 0,
		});

		expect(
			screen.queryByLabelText("library.clearFilters"),
		).not.toBeInTheDocument();
		expect(screen.getByText("library.filterAndSort")).toBeInTheDocument();
	});

	it("falls back to counting filterAndSortChoices when activeFilterCount is not provided", () => {
		renderButton({ filterAndSortChoices: { tags: ["Fiction"] } });

		expect(screen.getByLabelText("library.clearFilters")).toBeInTheDocument();
	});
});
