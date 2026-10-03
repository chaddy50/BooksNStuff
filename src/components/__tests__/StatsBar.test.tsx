import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StatsBar } from "#/components/StatsBar";
import type { FilterAndSortOptions } from "#/database/schema";
import { MediaItemStatus, PurchaseStatus } from "#/lib/enums";
import type { ItemStats } from "#/lib/queries/types";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

/**
 * Calls `search` against a few fixed `prev` fixtures so a test can tell a
 * merged override (the fixture's own field surviving alongside it) apart from
 * a replaced one, and can see how an existing `filterOrder` is handled without
 * each test having to reach into the link's `search` function itself.
 */
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		className,
		search,
	}: {
		children: React.ReactNode;
		className?: string;
		search?: (prev: Record<string, unknown>) => unknown;
	}) => (
		<a
			href="/library"
			className={className}
			data-search={
				search ? JSON.stringify(search({ titleQuery: "existing" })) : undefined
			}
			data-search-after-purchased-order={
				search
					? JSON.stringify(search({ filterOrder: ["purchaseStatuses"] }))
					: undefined
			}
			data-search-after-statuses-then-purchased-order={
				search
					? JSON.stringify(
							search({ filterOrder: ["statuses", "purchaseStatuses"] }),
						)
					: undefined
			}
		>
			{children}
		</a>
	),
}));

/**
 * Every field defaults to its own distinct non-zero number, so a count rendered
 * against the wrong label cannot pass by coincidence.
 */
function makeStats(overrides?: Partial<ItemStats>): ItemStats {
	return {
		totalCount: 11,
		completedCount: 22,
		purchasedCount: 44,
		droppedCount: 66,
		averageRating: 3.7,
		...overrides,
	};
}

function renderStatsBar(
	overrides?: Partial<ItemStats>,
	filters?: FilterAndSortOptions | null,
) {
	return render(
		<StatsBar
			stats={makeStats(overrides)}
			filters={filters}
			navigateTo="/library"
		/>,
	);
}

/** Reads the count rendered alongside a label, so pairings are checked as pairs. */
function readStatValue(labelKey: string): string | null | undefined {
	return screen.getByText(labelKey).previousElementSibling?.textContent;
}

/** The override a stat's link would merge onto the current search, or undefined if it isn't a link. */
function readLinkSearch(labelKey: string): Record<string, unknown> | undefined {
	const raw = screen
		.getByText(labelKey)
		.closest("a")
		?.getAttribute("data-search");
	return raw ? JSON.parse(raw) : undefined;
}

/** What a stat's link would produce when `purchaseStatuses` was already the latest click. */
function readLinkSearchAfterPurchasedOrder(
	labelKey: string,
): Record<string, unknown> | undefined {
	const raw = screen
		.getByText(labelKey)
		.closest("a")
		?.getAttribute("data-search-after-purchased-order");
	return raw ? JSON.parse(raw) : undefined;
}

/** What a stat's link would produce when `statuses` was clicked before `purchaseStatuses`. */
function readLinkSearchAfterStatusesThenPurchasedOrder(
	labelKey: string,
): Record<string, unknown> | undefined {
	const raw = screen
		.getByText(labelKey)
		.closest("a")
		?.getAttribute("data-search-after-statuses-then-purchased-order");
	return raw ? JSON.parse(raw) : undefined;
}

/**
 * The average is labelled by a star rather than by text, so it is read from its
 * own section instead of through {@link readStatValue}.
 */
function readAverageRating(): string | null | undefined {
	return screen.queryByTestId("stats-average-rating")?.firstElementChild
		?.textContent;
}

afterEach(cleanup);

describe("StatsBar", () => {
	it("renders nothing when the total is 0", () => {
		const { container } = renderStatsBar({
			totalCount: 0,
			completedCount: 0,
			purchasedCount: 0,
			droppedCount: 0,
		});

		expect(container).toBeEmptyDOMElement();
		expect(screen.queryByTestId("stats-bar")).not.toBeInTheDocument();
	});

	it("renders the bar once the total is non-zero", () => {
		renderStatsBar({ totalCount: 5 });

		expect(screen.getByTestId("stats-bar")).toBeInTheDocument();
		expect(readStatValue("stats.items")).toBe("5");
	});

	it("renders the completed and dropped counts", () => {
		renderStatsBar({
			totalCount: 6,
			completedCount: 3,
			droppedCount: 1,
		});

		expect(readStatValue("stats.completed")).toBe("3");
		expect(readStatValue("stats.dropped")).toBe("1");
	});

	it("renders the purchased count", () => {
		renderStatsBar({ purchasedCount: 4 });

		expect(readStatValue("stats.purchased")).toBe("4");
	});

	// Only the total gates visibility: a filter that matches items none of which
	// are completed, purchased or dropped still deserves its row of counts.
	it("stays visible when only the sub-counts are zero", () => {
		renderStatsBar({
			totalCount: 5,
			completedCount: 0,
			purchasedCount: 0,
			droppedCount: 0,
		});

		expect(screen.getByTestId("stats-bar")).toBeInTheDocument();
		expect(readStatValue("stats.items")).toBe("5");
		expect(readStatValue("stats.completed")).toBe("0");
		expect(readStatValue("stats.purchased")).toBe("0");
	});

	it("leaves dropped and its divider off when nothing was dropped", () => {
		renderStatsBar({ droppedCount: 0 });

		expect(screen.queryByText("stats.dropped")).not.toBeInTheDocument();
		// Items | purchased | completed | average.
		expect(screen.getAllByTestId("stats-divider")).toHaveLength(3);
	});

	it("shows dropped and its divider once something was dropped", () => {
		renderStatsBar({ droppedCount: 1 });

		expect(readStatValue("stats.dropped")).toBe("1");
		expect(screen.getAllByTestId("stats-divider")).toHaveLength(4);
	});

	it("labels every count through t()", () => {
		renderStatsBar();

		for (const key of [
			"stats.items",
			"stats.completed",
			"stats.purchased",
			"stats.dropped",
		]) {
			expect(screen.getByText(key), key).toBeInTheDocument();
		}
	});

	// A count the filters have already settled tells the user only what they
	// themselves asked for.
	it("hides the completed count in a view of completed items", () => {
		renderStatsBar(undefined, { statuses: [MediaItemStatus.COMPLETED] });

		expect(screen.queryByText("stats.completed")).not.toBeInTheDocument();
		expect(readStatValue("stats.items")).toBe("11");
	});

	// A finished-items view is a record of what was consumed; what was paid for
	// getting there is beside the point.
	it("hides the purchased count in a view of completed items", () => {
		renderStatsBar(undefined, { statuses: [MediaItemStatus.COMPLETED] });

		expect(screen.queryByText("stats.purchased")).not.toBeInTheDocument();
	});

	it("keeps the purchased count when completed is not the only status", () => {
		renderStatsBar(undefined, {
			statuses: [MediaItemStatus.COMPLETED, MediaItemStatus.DROPPED],
		});

		expect(readStatValue("stats.purchased")).toBe("44");
	});

	it("hides the completed count when the filter leaves completed out", () => {
		renderStatsBar(undefined, { statuses: [MediaItemStatus.BACKLOG] });

		expect(screen.queryByText("stats.completed")).not.toBeInTheDocument();
	});

	it("keeps the completed count when the status filter still lets it vary", () => {
		renderStatsBar(undefined, {
			statuses: [MediaItemStatus.COMPLETED, MediaItemStatus.IN_PROGRESS],
		});

		expect(readStatValue("stats.completed")).toBe("22");
	});

	it("hides the purchased count in a view of purchased items", () => {
		renderStatsBar(undefined, {
			purchaseStatuses: [PurchaseStatus.PURCHASED],
		});

		expect(screen.queryByText("stats.purchased")).not.toBeInTheDocument();
	});

	it("hides the dropped count in a view of dropped items", () => {
		renderStatsBar(undefined, { statuses: [MediaItemStatus.DROPPED] });

		expect(screen.queryByText("stats.dropped")).not.toBeInTheDocument();
	});

	// Hiding a section takes its divider with it, so nothing is left dangling.
	it("leaves no stranded dividers when the filters settle every count", () => {
		renderStatsBar(
			{ averageRating: null },
			{
				statuses: [MediaItemStatus.COMPLETED],
				purchaseStatuses: [PurchaseStatus.PURCHASED],
			},
		);

		expect(screen.queryAllByTestId("stats-divider")).toHaveLength(0);
		expect(readStatValue("stats.items")).toBe("11");
	});

	it("shows every count when no filters are applied", () => {
		renderStatsBar();

		expect(readStatValue("stats.items")).toBe("11");
		expect(readStatValue("stats.purchased")).toBe("44");
		expect(readStatValue("stats.completed")).toBe("22");
		expect(readStatValue("stats.dropped")).toBe("66");
	});

	// The dividers carry the grouping — the total, then progress, then spending,
	// then the abandoned ones — so their placement is the layout.
	it("gives the total, completed, purchased and dropped their own sections", () => {
		renderStatsBar();

		const bar = screen.getByTestId("stats-bar");
		const contents = Array.from(bar.children).map(
			(child) => child.getAttribute("data-testid") ?? child.textContent,
		);

		expect(contents).toEqual([
			"11stats.items",
			"stats-divider",
			"44stats.purchased",
			"stats-divider",
			"22stats.completed",
			"stats-divider",
			"66stats.dropped",
			"stats-divider",
			"stats-average-rating",
		]);
	});

	it("renders dropped last", () => {
		renderStatsBar();

		const purchasedLabel = screen.getByText("stats.purchased");
		const droppedLabel = screen.getByText("stats.dropped");

		expect(
			purchasedLabel.compareDocumentPosition(droppedLabel) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});
});

describe("StatsBar clickable stats", () => {
	it("links the completed stat to a view narrowed to completed items", () => {
		renderStatsBar();

		expect(readLinkSearch("stats.completed")).toEqual({
			titleQuery: "existing",
			statuses: [MediaItemStatus.COMPLETED],
			filterOrder: ["statuses"],
		});
	});

	it("links the dropped stat to a view narrowed to dropped items", () => {
		renderStatsBar({ droppedCount: 1 });

		expect(readLinkSearch("stats.dropped")).toEqual({
			titleQuery: "existing",
			statuses: [MediaItemStatus.DROPPED],
			filterOrder: ["statuses"],
		});
	});

	it("links the purchased stat to a view narrowed to purchased items", () => {
		renderStatsBar();

		expect(readLinkSearch("stats.purchased")).toEqual({
			titleQuery: "existing",
			purchaseStatuses: [PurchaseStatus.PURCHASED],
			filterOrder: ["purchaseStatuses"],
		});
	});

	it("keeps the items stat as plain, non-link text", () => {
		renderStatsBar();

		expect(screen.getByText("stats.items").closest("a")).toBeNull();
	});

	// Following the link would land on a view that is guaranteed to show nothing,
	// since the count the user clicked was already zero.
	it("keeps a zero completed count as plain, non-link text", () => {
		renderStatsBar({ totalCount: 5, completedCount: 0 });

		expect(screen.getByText("stats.completed").closest("a")).toBeNull();
	});

	it("keeps a zero purchased count as plain, non-link text", () => {
		renderStatsBar({ purchasedCount: 0 });

		expect(screen.getByText("stats.purchased").closest("a")).toBeNull();
	});

	it("keeps the average rating as plain, non-link text", () => {
		renderStatsBar({ averageRating: 4.2 });

		expect(screen.getByTestId("stats-average-rating").closest("a")).toBeNull();
	});
});

describe("StatsBar filter click order", () => {
	// So the view's title can later list "Purchased, Completed" rather than
	// always the same fixed field order regardless of which was clicked first.
	it("appends the clicked dimension after one already in filterOrder", () => {
		renderStatsBar();

		expect(
			readLinkSearchAfterPurchasedOrder("stats.completed")?.filterOrder,
		).toEqual(["purchaseStatuses", "statuses"]);
	});

	it("moves a dimension to the end instead of duplicating it on re-click", () => {
		renderStatsBar();

		expect(
			readLinkSearchAfterStatusesThenPurchasedOrder("stats.completed")
				?.filterOrder,
		).toEqual(["purchaseStatuses", "statuses"]);
	});

	it("leaves the other dimension's position alone when only one is reclicked", () => {
		renderStatsBar();

		expect(
			readLinkSearchAfterStatusesThenPurchasedOrder("stats.purchased")
				?.filterOrder,
		).toEqual(["statuses", "purchaseStatuses"]);
	});
});

describe("StatsBar average rating", () => {
	it("renders the average rating with its star", () => {
		renderStatsBar({ averageRating: 4.2 });

		expect(readAverageRating()).toBe("4.2");
		expect(
			screen.getByTestId("stats-average-rating").querySelector("svg"),
		).toBeInTheDocument();
	});

	it("formats a whole-number average to one decimal", () => {
		renderStatsBar({ averageRating: 4 });

		expect(readAverageRating()).toBe("4.0");
	});

	it("rounds the average to one decimal", () => {
		renderStatsBar({ averageRating: 4.25 });

		expect(readAverageRating()).toBe("4.3");

		cleanup();
		renderStatsBar({ averageRating: 3.666 });

		expect(readAverageRating()).toBe("3.7");
	});

	it("hides the average and its divider when nothing is rated", () => {
		renderStatsBar({ averageRating: null });

		expect(
			screen.queryByTestId("stats-average-rating"),
		).not.toBeInTheDocument();
		expect(screen.queryByText("stats.averageRating")).not.toBeInTheDocument();
		const dividersWithoutAverage =
			screen.getAllByTestId("stats-divider").length;

		cleanup();
		renderStatsBar({ averageRating: 4.2 });

		expect(screen.getAllByTestId("stats-divider")).toHaveLength(
			dividersWithoutAverage + 1,
		);
	});

	// `0` is not a rating the app can store — a cleared rating is filtered out of
	// the average — but the guard is an explicit null check rather than a falsy
	// one, and this is what pins that down.
	it("renders an average of 0 rather than treating it as absent", () => {
		renderStatsBar({ averageRating: 0 });

		expect(readAverageRating()).toBe("0.0");
	});

	it("renders the average after completed when nothing was dropped", () => {
		renderStatsBar({ droppedCount: 0, averageRating: 4.2 });

		const bar = screen.getByTestId("stats-bar");
		const contents = Array.from(bar.children).map(
			(child) => child.getAttribute("data-testid") ?? child.textContent,
		);

		expect(contents).toEqual([
			"11stats.items",
			"stats-divider",
			"44stats.purchased",
			"stats-divider",
			"22stats.completed",
			"stats-divider",
			"stats-average-rating",
		]);
	});

	// No filter can settle an average the way one settles a count, so it survives
	// even the filters that strip the bar down to its total.
	it("shows the average in a view of completed items", () => {
		renderStatsBar(
			{ averageRating: 4.2 },
			{ statuses: [MediaItemStatus.COMPLETED] },
		);

		expect(readAverageRating()).toBe("4.2");
	});

	it("labels the average through t() for assistive tech", () => {
		renderStatsBar({ averageRating: 4.2 });

		expect(screen.getByText("stats.averageRating")).toBeInTheDocument();
		expect(
			screen.getByTestId("stats-average-rating").querySelector("svg"),
		).toHaveAttribute("aria-hidden", "true");
	});
});

describe("StatsBar responsive layout", () => {
	it("lays out as a fixed 2-column grid below md, and the existing flex row at md and up", () => {
		renderStatsBar();

		expect(screen.getByTestId("stats-bar")).toHaveClass(
			"grid",
			"grid-cols-2",
			"gap-x-4",
			"gap-y-2",
			"md:flex",
			"md:flex-wrap",
			"md:items-center",
			"md:gap-x-5",
			"md:gap-y-1",
		);
	});

	it("hides the dividers below md, where they'd otherwise desync the 2-column grid", () => {
		renderStatsBar();

		for (const divider of screen.getAllByTestId("stats-divider")) {
			expect(divider).toHaveClass("hidden", "md:block");
		}
	});
});
