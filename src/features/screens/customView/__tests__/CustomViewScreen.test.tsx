import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FilterAndSortOptions, ViewSubject } from "#/database/schema";
import { ViewScreen } from "#/features/screens/customView/CustomViewScreen";
import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";
import type { ItemStats } from "#/lib/queries/types";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

let view: {
	id: number;
	name: string;
	subject: ViewSubject;
	filters?: FilterAndSortOptions;
} = { id: 1, name: "Owned books", subject: "items" };

// A stable object, as the real loader data is: only a refetch replaces it.
let loaderResults: { items: unknown[]; hasMore: boolean } = {
	items: [],
	hasMore: false,
};

/** Mimics the loader handing back a fresh result set. */
function simulateLoaderRefresh() {
	loaderResults = { items: [], hasMore: false };
}

// Series views carry no per-item stats, so the loader hands back null for them.
const EMPTY_STATS: ItemStats = {
	totalCount: 0,
	completedCount: 0,
	purchasedCount: 0,
	droppedCount: 0,
	averageRating: null,
};

let stats: ItemStats | null = EMPTY_STATS;
let viewSearch: {
	titleQuery?: string;
	statuses?: MediaItemStatus[];
	purchaseStatuses?: PurchaseStatus[];
	filterOrder?: ("statuses" | "purchaseStatuses")[];
} = {};
let historyEntryKey = "entry-1";

const routerInvalidate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({
		useLoaderData: () => ({ view, results: loaderResults, stats }),
		useSearch: () => viewSearch,
	}),
	useRouter: () => ({
		invalidate: routerInvalidate,
		history: { back: vi.fn() },
		state: { location: { state: { __TSR_key: historyEntryKey } } },
	}),
}));

vi.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

let capturedShouldShowPurchaseStatus: boolean | undefined;
let capturedShouldShowStatus: boolean | undefined;
let wasMediaItemListRendered = false;

vi.mock("#/components/MediaItemList", () => ({
	MediaItemList: (props: {
		shouldShowPurchaseStatus?: boolean;
		shouldShowStatus?: boolean;
	}) => {
		wasMediaItemListRendered = true;
		capturedShouldShowPurchaseStatus = props.shouldShowPurchaseStatus;
		capturedShouldShowStatus = props.shouldShowStatus;
		return <div data-testid="media-item-list" />;
	},
}));

// StatsBar's own rendering is covered by its suite; here only the hand-off and
// the screen's decision to show it at all matter.
let capturedStats: ItemStats | undefined;
let capturedFilters: FilterAndSortOptions | null | undefined;
let capturedNavigateTo: string | undefined;
let capturedParams: Record<string, string> | undefined;

vi.mock("#/components/StatsBar", () => ({
	StatsBar: (props: {
		stats: ItemStats;
		filters?: FilterAndSortOptions | null;
		navigateTo?: string;
		params?: Record<string, string>;
	}) => {
		capturedStats = props.stats;
		capturedFilters = props.filters;
		capturedNavigateTo = props.navigateTo;
		capturedParams = props.params;
		return <div data-testid="stats-bar" />;
	},
}));

vi.mock("#/components/SeriesList", () => ({ SeriesList: () => null }));

vi.mock("#/features/screens/customView/EditViewDialog", () => ({
	EditViewDialog: () => null,
}));
// Renders the action slot so the reorder toggle is reachable.
vi.mock("#/features/navigation/topBar/TopBar", () => ({
	TopBar: ({
		title,
		right,
		below,
	}: {
		title?: string;
		right?: React.ReactNode;
		below?: React.ReactNode;
	}) => (
		<div>
			<h1>{title}</h1>
			{right}
			<div data-testid="top-bar-below">{below}</div>
		</div>
	),
}));
vi.mock("#/features/navigation/topBar/components/SearchInput", () => ({
	SearchInput: () => null,
}));

let capturedOnReorder: ((orderedMediaItemIds: number[]) => void) | null = null;
vi.mock("#/features/screens/customView/components/ReorderableItemGrid", () => ({
	ReorderableItemGrid: ({
		onReorder,
	}: {
		onReorder: (orderedMediaItemIds: number[]) => void;
	}) => {
		capturedOnReorder = onReorder;
		return <div data-testid="reorderable-grid" />;
	},
}));

// Keeps the server fns (and their drizzle client) out of the unit test.
const getViewOrderItems = vi.fn().mockResolvedValue([]);
const reorderViewItems = vi.fn().mockResolvedValue(undefined);
const getViewResults = vi
	.fn()
	.mockResolvedValue({ results: { items: [], hasMore: false } });
vi.mock("#/features/screens/customView/view", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("#/features/screens/customView/view")>();
	return {
		applyViewFilterOverrides: actual.applyViewFilterOverrides,
		getViewResults: (...args: unknown[]) => getViewResults(...args),
		deleteView: vi.fn(),
		reorderViewItems: (...args: unknown[]) => reorderViewItems(...args),
		getViewOrderItems: (...args: unknown[]) => getViewOrderItems(...args),
	};
});

// jsdom has no IntersectionObserver, which the real hook constructs on mount.
// The options are captured because the cache key and the fetchMore closure this
// screen builds are the screen's own responsibility; the hook's own behaviour
// is covered by its suite.
let capturedCacheKey: string | undefined;
let capturedFetchMore:
	| ((
			offset: number,
			limit?: number,
	  ) => Promise<{ items: unknown[]; hasMore: boolean }>)
	| undefined;

vi.mock("#/components/hooks/useInfiniteScroll", () => ({
	useInfiniteScroll: (options: {
		cacheKey: string;
		fetchMore: (
			offset: number,
			limit?: number,
		) => Promise<{ items: unknown[]; hasMore: boolean }>;
	}) => {
		capturedCacheKey = options.cacheKey;
		capturedFetchMore = options.fetchMore;
		return {
			allItems: [],
			isLoadingMore: false,
			sentinelRef: { current: null },
		};
	},
}));

afterEach(cleanup);
beforeEach(() => {
	view = { id: 1, name: "Owned books", subject: "items" };
	stats = EMPTY_STATS;
	viewSearch = {};
	historyEntryKey = "entry-1";
	capturedCacheKey = undefined;
	capturedFetchMore = undefined;
	capturedStats = undefined;
	capturedFilters = undefined;
	capturedNavigateTo = undefined;
	capturedParams = undefined;
	capturedShouldShowPurchaseStatus = undefined;
	capturedShouldShowStatus = undefined;
	wasMediaItemListRendered = false;
	loaderResults = { items: [], hasMore: false };
	routerInvalidate.mockClear();
	// The real invalidate refetches, then commits new loader data.
	routerInvalidate.mockImplementation(async () => {
		simulateLoaderRefresh();
	});
	getViewOrderItems.mockClear();
	getViewOrderItems.mockResolvedValue([]);
	capturedOnReorder = null;
	reorderViewItems.mockClear();
	reorderViewItems.mockResolvedValue(undefined);
	getViewResults.mockClear();
	getViewResults.mockResolvedValue({ results: { items: [], hasMore: false } });
});

describe("ViewScreen purchase badge visibility", () => {
	it("hides the badge when the saved view pins one purchase status", () => {
		view.filters = { purchaseStatuses: [PurchaseStatus.PURCHASED] };

		render(<ViewScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(false);
	});

	it("shows the badge when the saved view allows two purchase statuses", () => {
		view.filters = {
			purchaseStatuses: [
				PurchaseStatus.PURCHASED,
				PurchaseStatus.NOT_PURCHASED,
			],
		};

		render(<ViewScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(true);
	});

	it("shows the badge when the saved filters omit purchaseStatuses", () => {
		view.filters = { mediaTypes: [MediaItemType.BOOK] };

		render(<ViewScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(true);
	});

	it("shows the badge when the view has no filters at all", () => {
		view.filters = undefined;

		render(<ViewScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(true);
	});

	it("renders no MediaItemList for a series view", () => {
		view = { id: 2, name: "Owned series", subject: "series" };

		render(<ViewScreen />);

		expect(wasMediaItemListRendered).toBe(false);
	});
});

describe("ViewScreen status badge visibility", () => {
	it("hides the badge when the saved view pins one status", () => {
		view.filters = { statuses: [MediaItemStatus.IN_PROGRESS] };

		render(<ViewScreen />);

		expect(capturedShouldShowStatus).toBe(false);
	});

	it("shows the badge when the saved view allows two statuses", () => {
		view.filters = {
			statuses: [MediaItemStatus.IN_PROGRESS, MediaItemStatus.COMPLETED],
		};

		render(<ViewScreen />);

		expect(capturedShouldShowStatus).toBe(true);
	});

	it("shows the badge when the saved filters omit statuses", () => {
		view.filters = { mediaTypes: [MediaItemType.BOOK] };

		render(<ViewScreen />);

		expect(capturedShouldShowStatus).toBe(true);
	});

	it("shows the badge when the view has no filters at all", () => {
		view.filters = undefined;

		render(<ViewScreen />);

		expect(capturedShouldShowStatus).toBe(true);
	});

	it("derives the status and purchase flags independently", () => {
		view.filters = {
			statuses: [MediaItemStatus.IN_PROGRESS],
			purchaseStatuses: [],
		};

		render(<ViewScreen />);

		expect(capturedShouldShowStatus).toBe(false);
		expect(capturedShouldShowPurchaseStatus).toBe(true);
	});

	// Clicking a stat narrows the view the same way the view's own saved status
	// filter would, so the per-card badge it would otherwise suppress has to
	// disappear too.
	it("hides the badge once a URL status override pins a single status", () => {
		view.filters = undefined;
		viewSearch = { statuses: [MediaItemStatus.COMPLETED] };

		render(<ViewScreen />);

		expect(capturedShouldShowStatus).toBe(false);
	});

	it("hides the purchase badge once a URL purchase-status override pins a single value", () => {
		view.filters = undefined;
		viewSearch = { purchaseStatuses: [PurchaseStatus.PURCHASED] };

		render(<ViewScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(false);
	});
});

describe("ViewScreen stats bar", () => {
	it("renders the stats bar for an item view", () => {
		render(<ViewScreen />);

		expect(screen.getByTestId("stats-bar")).toBeInTheDocument();
	});

	// The bar hides counts the view's own filters have already settled, so it
	// needs those filters.
	it("hands the bar the view's filters", () => {
		view.filters = { statuses: [MediaItemStatus.COMPLETED] };

		render(<ViewScreen />);

		expect(capturedFilters).toEqual({
			statuses: [MediaItemStatus.COMPLETED],
		});
	});

	// The bar belongs to the sticky header, so it stays on screen while the grid
	// scrolls underneath it.
	it("renders the bar in the top bar rather than in the scrolling list", () => {
		render(<ViewScreen />);

		expect(screen.getByTestId("top-bar-below")).toContainElement(
			screen.getByTestId("stats-bar"),
		);
	});

	// Series views count series, not items, so there is nothing for the bar to say.
	it("renders no stats bar for a series view", () => {
		view = { id: 2, name: "Owned series", subject: "series" };
		stats = null;

		render(<ViewScreen />);

		expect(screen.queryByTestId("stats-bar")).not.toBeInTheDocument();
	});

	it("hides the stats bar while reordering", async () => {
		view.filters = { sortBy: "custom" };
		render(<ViewScreen />);

		fireEvent.click(screen.getByRole("button", { name: "views.reorder" }));

		expect(await screen.findByTestId("reorderable-grid")).toBeInTheDocument();
		expect(screen.queryByTestId("stats-bar")).not.toBeInTheDocument();
	});

	it("restores the stats bar when reordering ends", async () => {
		view.filters = { sortBy: "custom" };
		render(<ViewScreen />);

		fireEvent.click(screen.getByRole("button", { name: "views.reorder" }));
		await screen.findByTestId("reorderable-grid");

		fireEvent.click(
			screen.getByRole("button", { name: "views.doneReordering" }),
		);

		await screen.findByTestId("media-item-list");
		expect(screen.getByTestId("stats-bar")).toBeInTheDocument();
	});

	it("forwards the loader's stats unchanged", () => {
		const loaderStats: ItemStats = {
			totalCount: 12,
			completedCount: 5,
			purchasedCount: 4,
			droppedCount: 1,
			averageRating: 4.2,
		};
		stats = loaderStats;

		render(<ViewScreen />);

		expect(capturedStats).toBe(loaderStats);
	});

	// So a clicked stat lands back on the same view, not the library.
	it("points the bar's stat links at this view", () => {
		view = { id: 7, name: "Owned books", subject: "items" };

		render(<ViewScreen />);

		expect(capturedNavigateTo).toBe("/views/$viewId");
		expect(capturedParams).toEqual({ viewId: "7" });
	});

	// A click narrows the view through the URL rather than the saved filters,
	// so the bar (and its own show/hide rules) need the narrowed view, not the
	// view's unfiltered saved definition.
	it("merges a status override from the URL into the filters handed to the bar", () => {
		view.filters = { mediaTypes: [MediaItemType.BOOK] };
		viewSearch = { statuses: [MediaItemStatus.COMPLETED] };

		render(<ViewScreen />);

		expect(capturedFilters).toMatchObject({
			mediaTypes: [MediaItemType.BOOK],
			statuses: [MediaItemStatus.COMPLETED],
		});
	});

	it("lets a URL status override replace the view's own saved status filter", () => {
		view.filters = { statuses: [MediaItemStatus.IN_PROGRESS] };
		viewSearch = { statuses: [MediaItemStatus.COMPLETED] };

		render(<ViewScreen />);

		expect(capturedFilters).toMatchObject({
			statuses: [MediaItemStatus.COMPLETED],
		});
	});
});

describe("ViewScreen title", () => {
	it("shows the plain view name when no filter override is active", () => {
		view = { id: 1, name: "Bookshelf", subject: "items" };

		render(<ViewScreen />);

		expect(screen.getByText("Bookshelf")).toBeInTheDocument();
	});

	it("appends the active status override to the title", () => {
		view = { id: 1, name: "Bookshelf", subject: "items" };
		viewSearch = { statuses: [MediaItemStatus.COMPLETED] };

		render(<ViewScreen />);

		expect(screen.getByText("Bookshelf - stats.completed")).toBeInTheDocument();
	});

	it("appends the active dropped override to the title", () => {
		view = { id: 1, name: "Bookshelf", subject: "items" };
		viewSearch = { statuses: [MediaItemStatus.DROPPED] };

		render(<ViewScreen />);

		expect(screen.getByText("Bookshelf - stats.dropped")).toBeInTheDocument();
	});

	it("appends the active purchase-status override to the title", () => {
		view = { id: 1, name: "Bookshelf", subject: "items" };
		viewSearch = { purchaseStatuses: [PurchaseStatus.PURCHASED] };

		render(<ViewScreen />);

		expect(screen.getByText("Bookshelf - stats.purchased")).toBeInTheDocument();
	});

	// Possible when a status stat was clicked, then a purchase stat was clicked
	// too — each click only sets its own dimension, preserving the other. With
	// no recorded click order this falls back to a stable default.
	it("joins multiple active overrides", () => {
		view = { id: 1, name: "Bookshelf", subject: "items" };
		viewSearch = {
			statuses: [MediaItemStatus.COMPLETED],
			purchaseStatuses: [PurchaseStatus.PURCHASED],
		};

		render(<ViewScreen />);

		expect(
			screen.getByText("Bookshelf - stats.completed, stats.purchased"),
		).toBeInTheDocument();
	});

	it("lists the overrides in the order the user clicked them", () => {
		view = { id: 1, name: "Bookshelf", subject: "items" };
		viewSearch = {
			statuses: [MediaItemStatus.COMPLETED],
			purchaseStatuses: [PurchaseStatus.PURCHASED],
			filterOrder: ["purchaseStatuses", "statuses"],
		};

		render(<ViewScreen />);

		expect(
			screen.getByText("Bookshelf - stats.purchased, stats.completed"),
		).toBeInTheDocument();
	});

	it("honors the opposite click order too", () => {
		view = { id: 1, name: "Bookshelf", subject: "items" };
		viewSearch = {
			statuses: [MediaItemStatus.COMPLETED],
			purchaseStatuses: [PurchaseStatus.PURCHASED],
			filterOrder: ["statuses", "purchaseStatuses"],
		};

		render(<ViewScreen />);

		expect(
			screen.getByText("Bookshelf - stats.completed, stats.purchased"),
		).toBeInTheDocument();
	});

	// A filterOrder entry for a dimension that is no longer active (e.g. after
	// editing the view) shouldn't produce a label with nothing behind it.
	it("ignores a filterOrder entry for a dimension that is not active", () => {
		view = { id: 1, name: "Bookshelf", subject: "items" };
		viewSearch = {
			statuses: [MediaItemStatus.COMPLETED],
			filterOrder: ["purchaseStatuses", "statuses"],
		};

		render(<ViewScreen />);

		expect(screen.getByText("Bookshelf - stats.completed")).toBeInTheDocument();
	});

	it("does not append anything for a view with no filters and empty search", () => {
		view = { id: 1, name: "Bookshelf", subject: "items" };
		viewSearch = {};

		render(<ViewScreen />);

		expect(screen.queryByText(/Bookshelf -/)).not.toBeInTheDocument();
	});
});

describe("ViewScreen reorder mode", () => {
	/** Finds the reorder toggle, which every item view offers. */
	function queryReorderButton() {
		return screen.queryByRole("button", { name: "views.reorder" });
	}

	it("offers reordering for a custom-ordered item view", () => {
		view.filters = { sortBy: "custom" };

		render(<ViewScreen />);

		expect(queryReorderButton()).toBeInTheDocument();
	});

	// Arranging a view by hand is what switches it to custom order, so the
	// entry point cannot be gated on the view already being custom-ordered.
	it("offers reordering for an item view sorted by something else", () => {
		view.filters = { sortBy: "series" };

		render(<ViewScreen />);

		expect(queryReorderButton()).toBeInTheDocument();
	});

	it("offers reordering for an item view with no filters", () => {
		view.filters = undefined;

		render(<ViewScreen />);

		expect(queryReorderButton()).toBeInTheDocument();
	});

	// Custom order is keyed on media items, so a series view can never use it.
	it("does not offer reordering for a series view", () => {
		view = {
			id: 2,
			name: "Owned series",
			subject: "series",
			filters: { sortBy: "custom" },
		};

		render(<ViewScreen />);

		expect(queryReorderButton()).not.toBeInTheDocument();
	});

	it("loads the whole result set when reordering starts", async () => {
		view.filters = { sortBy: "custom" };
		render(<ViewScreen />);

		fireEvent.click(screen.getByRole("button", { name: "views.reorder" }));

		await waitFor(() => {
			expect(getViewOrderItems).toHaveBeenCalledWith({
				data: { viewId: view.id },
			});
		});
	});

	it("swaps the paginated list for the reorderable grid", async () => {
		view.filters = { sortBy: "custom" };
		render(<ViewScreen />);
		expect(screen.getByTestId("media-item-list")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "views.reorder" }));

		expect(await screen.findByTestId("reorderable-grid")).toBeInTheDocument();
		expect(screen.queryByTestId("media-item-list")).not.toBeInTheDocument();
	});

	it("restores the paginated list and refetches when reordering ends", async () => {
		view.filters = { sortBy: "custom" };
		render(<ViewScreen />);

		fireEvent.click(screen.getByRole("button", { name: "views.reorder" }));
		await screen.findByTestId("reorderable-grid");

		fireEvent.click(
			screen.getByRole("button", { name: "views.doneReordering" }),
		);

		expect(await screen.findByTestId("media-item-list")).toBeInTheDocument();
		expect(screen.queryByTestId("reorderable-grid")).not.toBeInTheDocument();
		await waitFor(() => {
			expect(routerInvalidate).toHaveBeenCalledTimes(1);
		});
	});
});

// The router remounts the screen on a viewId change (see the route's
// remountDeps), which is only a fix while reorder state lives on the mount
// rather than in a module-level store.
describe("ViewScreen reorder state lifetime", () => {
	it("starts a freshly mounted view outside reorder mode", async () => {
		view.filters = { sortBy: "custom" };
		render(<ViewScreen />);
		fireEvent.click(screen.getByRole("button", { name: "views.reorder" }));
		await screen.findByTestId("reorderable-grid");

		cleanup();
		view = { id: 2, name: "Owned films", subject: "items" };
		render(<ViewScreen />);

		expect(screen.queryByTestId("reorderable-grid")).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "views.reorder" }),
		).toBeInTheDocument();
	});
});

describe("ViewScreen reorder persistence", () => {
	/** Enters reorder mode and hands back the grid's reorder callback. */
	async function startReordering() {
		view.filters = { sortBy: "custom" };
		render(<ViewScreen />);
		fireEvent.click(screen.getByRole("button", { name: "views.reorder" }));
		await screen.findByTestId("reorderable-grid");
	}

	it("saves the new order the grid reports", async () => {
		await startReordering();

		act(() => {
			capturedOnReorder?.([3, 1, 2]);
		});

		await waitFor(() => {
			expect(reorderViewItems).toHaveBeenCalledWith({
				data: { viewId: view.id, orderedMediaItemIds: [3, 1, 2] },
			});
		});
	});

	// The bug this guards: Done used to refetch while the save was still in
	// flight, so the loader re-read the pre-drag order and the reordering
	// looked like it had been thrown away.
	it("waits for an in-flight save before refetching", async () => {
		let releaseSave: () => void = () => {};
		reorderViewItems.mockReturnValue(
			new Promise<void>((resolve) => {
				releaseSave = () => resolve();
			}),
		);
		await startReordering();

		act(() => {
			capturedOnReorder?.([3, 1, 2]);
		});
		fireEvent.click(
			screen.getByRole("button", { name: "views.doneReordering" }),
		);

		// Still saving — refetching now would read the old order.
		await Promise.resolve();
		expect(routerInvalidate).not.toHaveBeenCalled();

		await act(async () => {
			releaseSave();
		});

		await waitFor(() => {
			expect(routerInvalidate).toHaveBeenCalledTimes(1);
		});
	});

	it("surfaces a failed save instead of silently dropping it", async () => {
		reorderViewItems.mockRejectedValue(new Error("network down"));
		await startReordering();

		act(() => {
			capturedOnReorder?.([3, 1, 2]);
		});

		expect(await screen.findByText("views.reorderFailed")).toBeInTheDocument();
	});
});

describe("ViewScreen reorder hand-off", () => {
	// The bug this guards: Done used to hand the screen back to the paginated
	// list before the refetch landed, so the list painted its stale pre-drag
	// order and the items visibly snapped back before jumping into place.
	it("keeps the grid up until the refreshed list data has arrived", async () => {
		let releaseInvalidate: () => void = () => {};
		routerInvalidate.mockImplementation(
			() =>
				new Promise<void>((resolve) => {
					releaseInvalidate = () => {
						simulateLoaderRefresh();
						resolve();
					};
				}),
		);

		view.filters = { sortBy: "custom" };
		render(<ViewScreen />);
		fireEvent.click(screen.getByRole("button", { name: "views.reorder" }));
		await screen.findByTestId("reorderable-grid");

		fireEvent.click(
			screen.getByRole("button", { name: "views.doneReordering" }),
		);
		await waitFor(() => {
			expect(routerInvalidate).toHaveBeenCalled();
		});

		// Mid-refetch: the arrangement stays on screen, the stale list stays away.
		expect(screen.getByTestId("reorderable-grid")).toBeInTheDocument();
		expect(screen.queryByTestId("media-item-list")).not.toBeInTheDocument();

		await act(async () => {
			releaseInvalidate();
		});

		expect(await screen.findByTestId("media-item-list")).toBeInTheDocument();
		expect(screen.queryByTestId("reorderable-grid")).not.toBeInTheDocument();
	});
});

describe("ViewScreen reorder hand-off under a deferred transition", () => {
	// The bug this guards: the router commits loader updates inside a React
	// transition, so `invalidate()` can resolve while the new data is still
	// uncommitted. Anything that swapped back on a timer raced that transition
	// and let the list paint its pre-drag order first.
	it("does not swap back while invalidate has resolved but the data has not", async () => {
		routerInvalidate.mockResolvedValue(undefined);

		view.filters = { sortBy: "custom" };
		render(<ViewScreen />);
		fireEvent.click(screen.getByRole("button", { name: "views.reorder" }));
		await screen.findByTestId("reorderable-grid");

		fireEvent.click(
			screen.getByRole("button", { name: "views.doneReordering" }),
		);
		await waitFor(() => {
			expect(routerInvalidate).toHaveBeenCalled();
		});

		// Data still pending: the arrangement must stay on screen.
		expect(screen.getByTestId("reorderable-grid")).toBeInTheDocument();
		expect(screen.queryByTestId("media-item-list")).not.toBeInTheDocument();

		// The transition finally commits the refreshed data.
		await act(async () => {
			simulateLoaderRefresh();
			fireEvent.click(screen.getByRole("button", { name: "views.editView" }));
		});

		expect(await screen.findByTestId("media-item-list")).toBeInTheDocument();
		expect(screen.queryByTestId("reorderable-grid")).not.toBeInTheDocument();
	});
});

// Every view pages through the same server fn, so the key is what stops one view's
// loaded pages — and its scroll position — restoring underneath another.
describe("ViewScreen infinite scroll cache key", () => {
	it("derives the key from the view being shown", () => {
		view = { id: 7, name: "Owned books", subject: "items" };

		render(<ViewScreen />);

		expect(capturedCacheKey).toContain("view:7");
	});

	it("gives two views two different keys", () => {
		view = { id: 1, name: "Owned books", subject: "items" };
		render(<ViewScreen />);
		const firstViewKey = capturedCacheKey;

		cleanup();
		view = { id: 2, name: "Owned films", subject: "items" };
		render(<ViewScreen />);

		expect(capturedCacheKey).not.toBe(firstViewKey);
	});

	it("changes the key when the visit is a new history entry", () => {
		render(<ViewScreen />);
		const firstVisitKey = capturedCacheKey;

		cleanup();
		historyEntryKey = "entry-2";
		render(<ViewScreen />);

		expect(capturedCacheKey).not.toBe(firstVisitKey);
	});

	it("changes the key when the title query changes", () => {
		viewSearch = {};
		render(<ViewScreen />);
		const unsearchedKey = capturedCacheKey;

		cleanup();
		viewSearch = { titleQuery: "dune" };
		render(<ViewScreen />);

		expect(capturedCacheKey).not.toBe(unsearchedKey);
		expect(capturedCacheKey).toContain("dune");
	});

	// Without this, clicking a stat changes the loader data but the infinite
	// scroll hook sees the same key, treats it as the same list, and refreshes
	// using the stale (unfiltered) query instead of resetting to the new one.
	it("changes the key when a status override is added", () => {
		viewSearch = {};
		render(<ViewScreen />);
		const unfilteredKey = capturedCacheKey;

		cleanup();
		viewSearch = { statuses: [MediaItemStatus.COMPLETED] };
		render(<ViewScreen />);

		expect(capturedCacheKey).not.toBe(unfilteredKey);
	});

	it("changes the key when a purchase-status override is added", () => {
		viewSearch = {};
		render(<ViewScreen />);
		const unfilteredKey = capturedCacheKey;

		cleanup();
		viewSearch = { purchaseStatuses: [PurchaseStatus.PURCHASED] };
		render(<ViewScreen />);

		expect(capturedCacheKey).not.toBe(unfilteredKey);
	});
});

describe("ViewScreen paging with an active filter override", () => {
	it("forwards the status override to getViewResults when paging", async () => {
		view = { id: 3, name: "Bookshelf", subject: "items" };
		viewSearch = { statuses: [MediaItemStatus.COMPLETED] };

		render(<ViewScreen />);
		await capturedFetchMore?.(0, 20);

		expect(getViewResults).toHaveBeenCalledWith({
			data: {
				viewId: 3,
				titleQuery: undefined,
				statuses: [MediaItemStatus.COMPLETED],
				purchaseStatuses: undefined,
				offset: 0,
				limit: 20,
			},
		});
	});

	it("forwards the purchase-status override to getViewResults when paging", async () => {
		view = { id: 3, name: "Bookshelf", subject: "items" };
		viewSearch = { purchaseStatuses: [PurchaseStatus.PURCHASED] };

		render(<ViewScreen />);
		await capturedFetchMore?.(0, 20);

		expect(getViewResults).toHaveBeenCalledWith({
			data: {
				viewId: 3,
				titleQuery: undefined,
				statuses: undefined,
				purchaseStatuses: [PurchaseStatus.PURCHASED],
				offset: 0,
				limit: 20,
			},
		});
	});
});
