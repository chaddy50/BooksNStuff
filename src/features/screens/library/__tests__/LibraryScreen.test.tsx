import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FilterAndSortOptions } from "#/database/schema";
import { LibraryScreen } from "#/features/screens/library/LibraryScreen";
import { MediaItemStatus, PurchaseStatus } from "#/lib/enums";
import type { ItemStats } from "#/lib/queries/types";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const EMPTY_STATS: ItemStats = {
	totalCount: 0,
	completedCount: 0,
	purchasedCount: 0,
	droppedCount: 0,
	averageRating: null,
};

let search: FilterAndSortOptions = {};
let settings: unknown = null;
let stats: ItemStats = EMPTY_STATS;
let historyEntryKey = "entry-1";

vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({
		useLoaderData: () => ({ items: [], hasMore: false, stats, settings }),
		useSearch: () => search,
	}),
	useRouter: () => ({
		state: { location: { state: { __TSR_key: historyEntryKey } } },
	}),
}));

// The captured prop is the unit under test — MediaItemList's own rendering is
// covered by its suite.
let capturedShouldShowPurchaseStatus: boolean | undefined;
let capturedShouldShowStatus: boolean | undefined;

vi.mock("#/components/MediaItemList", () => ({
	MediaItemList: (props: {
		shouldShowPurchaseStatus?: boolean;
		shouldShowStatus?: boolean;
	}) => {
		capturedShouldShowPurchaseStatus = props.shouldShowPurchaseStatus;
		capturedShouldShowStatus = props.shouldShowStatus;
		return <div data-testid="media-item-list" />;
	},
}));

// StatsBar's own rendering — including the hidden zero-total state — is covered
// by its suite; here only the hand-off matters.
let capturedStats: ItemStats | undefined;
let capturedFilters: FilterAndSortOptions | null | undefined;
let capturedNavigateTo: string | undefined;

vi.mock("#/components/StatsBar", () => ({
	StatsBar: (props: {
		stats: ItemStats;
		filters?: FilterAndSortOptions | null;
		navigateTo?: string;
	}) => {
		capturedStats = props.stats;
		capturedFilters = props.filters;
		capturedNavigateTo = props.navigateTo;
		return <div data-testid="stats-bar" />;
	},
}));

// The stats bar renders in the top bar's `below` slot, so the stub has to pass
// that slot through for the screen's hand-off to be observable.
vi.mock("#/features/navigation/topBar/TopBar", () => ({
	TopBar: ({ below }: { below?: React.ReactNode }) => (
		<div data-testid="top-bar-below">{below}</div>
	),
}));
vi.mock("#/features/navigation/topBar/components/SearchInput", () => ({
	SearchInput: () => null,
}));
vi.mock("#/features/filterAndSort/FilterAndSortButton", () => ({
	FilterAndSortButton: () => null,
}));

// Keeps the server fn (and its drizzle client) out of the unit test.
vi.mock("#/features/screens/library/library", () => ({ getLibrary: vi.fn() }));

// jsdom has no IntersectionObserver, which the real hook constructs on mount.
// The options are captured because the cache key the screen derives is the screen's
// responsibility; the hook's own behaviour is covered by its suite.
let capturedCacheKey: string | undefined;

vi.mock("#/components/hooks/useInfiniteScroll", () => ({
	useInfiniteScroll: (options: { cacheKey: string }) => {
		capturedCacheKey = options.cacheKey;
		return {
			allItems: [],
			isLoadingMore: false,
			sentinelRef: { current: null },
		};
	},
}));

afterEach(cleanup);
beforeEach(() => {
	search = {};
	settings = null;
	stats = EMPTY_STATS;
	historyEntryKey = "entry-1";
	capturedShouldShowPurchaseStatus = undefined;
	capturedShouldShowStatus = undefined;
	capturedStats = undefined;
	capturedFilters = undefined;
	capturedNavigateTo = undefined;
	capturedCacheKey = undefined;
});

describe("LibraryScreen stats bar", () => {
	it("hands the loader's stats straight to the bar", () => {
		const loaderStats: ItemStats = {
			totalCount: 12,
			completedCount: 5,
			purchasedCount: 4,
			droppedCount: 1,
			averageRating: 4.2,
		};
		stats = loaderStats;

		render(<LibraryScreen />);

		expect(capturedStats).toBe(loaderStats);
	});

	it("renders the bar above the item list", () => {
		stats = { ...EMPTY_STATS, totalCount: 3 };

		render(<LibraryScreen />);

		const statsBar = screen.getByTestId("stats-bar");
		const mediaItemList = screen.getByTestId("media-item-list");
		expect(
			statsBar.compareDocumentPosition(mediaItemList) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	// The bar hides counts the filters have already settled, so it needs the same
	// search the list ran with — defaults applied and all.
	it("hands the bar the search the list ran with", () => {
		search = { statuses: [MediaItemStatus.COMPLETED] };
		settings = {
			defaultLibrarySortBy: "title",
			defaultLibrarySortDirection: "asc",
		};

		render(<LibraryScreen />);

		expect(capturedFilters).toMatchObject({
			statuses: [MediaItemStatus.COMPLETED],
			sortBy: "title",
		});
	});

	// The bar belongs to the sticky header, so it stays on screen while the list
	// scrolls underneath it.
	it("renders the bar in the top bar rather than in the scrolling list", () => {
		stats = { ...EMPTY_STATS, totalCount: 3 };

		render(<LibraryScreen />);

		expect(screen.getByTestId("top-bar-below")).toContainElement(
			screen.getByTestId("stats-bar"),
		);
	});

	// Hiding an empty summary is StatsBar's call, not the screen's.
	it("delegates the zero-total hidden state rather than deciding itself", () => {
		stats = EMPTY_STATS;

		render(<LibraryScreen />);

		expect(screen.getByTestId("stats-bar")).toBeInTheDocument();
		expect(capturedStats).toEqual(EMPTY_STATS);
	});

	// So a clicked stat (e.g. "Completed") lands back on the library.
	it("points the bar's stat links at the library route", () => {
		render(<LibraryScreen />);

		expect(capturedNavigateTo).toBe("/library");
	});
});

describe("LibraryScreen purchase badge visibility", () => {
	it("hides the badge when filtered to exactly one purchase status", () => {
		search = { purchaseStatuses: [PurchaseStatus.PURCHASED] };

		render(<LibraryScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(false);
	});

	it("shows the badge when two purchase statuses are selected", () => {
		search = {
			purchaseStatuses: [PurchaseStatus.PURCHASED, PurchaseStatus.WANT_TO_BUY],
		};

		render(<LibraryScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(true);
	});

	it("shows the badge when every purchase status is selected", () => {
		search = { purchaseStatuses: Object.values(PurchaseStatus) };

		render(<LibraryScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(true);
	});

	it("shows the badge when the purchase filter is an empty array", () => {
		search = { purchaseStatuses: [] };

		render(<LibraryScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(true);
	});

	it("shows the badge when no purchase filter is set", () => {
		search = {};

		render(<LibraryScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(true);
	});

	// Guards against applyLibrarySortDefaults dropping the filter while merging.
	it("keeps the purchase filter when sort defaults are applied", () => {
		search = { purchaseStatuses: [PurchaseStatus.PURCHASED] };
		settings = {
			defaultLibrarySortBy: "title",
			defaultLibrarySortDirection: "asc",
		};

		render(<LibraryScreen />);

		expect(capturedShouldShowPurchaseStatus).toBe(false);
	});
});

describe("LibraryScreen status badge visibility", () => {
	it("hides the badge when filtered to exactly one status", () => {
		search = { statuses: [MediaItemStatus.IN_PROGRESS] };

		render(<LibraryScreen />);

		expect(capturedShouldShowStatus).toBe(false);
	});

	it("shows the badge when two statuses are selected", () => {
		search = {
			statuses: [MediaItemStatus.IN_PROGRESS, MediaItemStatus.ON_HOLD],
		};

		render(<LibraryScreen />);

		expect(capturedShouldShowStatus).toBe(true);
	});

	it("shows the badge when every status is selected", () => {
		search = { statuses: Object.values(MediaItemStatus) };

		render(<LibraryScreen />);

		expect(capturedShouldShowStatus).toBe(true);
	});

	it("shows the badge when the status filter is an empty array", () => {
		search = { statuses: [] };

		render(<LibraryScreen />);

		expect(capturedShouldShowStatus).toBe(true);
	});

	it("shows the badge when no status filter is set", () => {
		search = {};

		render(<LibraryScreen />);

		expect(capturedShouldShowStatus).toBe(true);
	});

	// Guards against applyLibrarySortDefaults dropping the filter while merging.
	it("keeps the status filter when sort defaults are applied", () => {
		search = { statuses: [MediaItemStatus.IN_PROGRESS] };
		settings = {
			defaultLibrarySortBy: "title",
			defaultLibrarySortDirection: "asc",
		};

		render(<LibraryScreen />);

		expect(capturedShouldShowStatus).toBe(false);
	});

	it("derives the status and purchase flags independently", () => {
		search = { statuses: [MediaItemStatus.IN_PROGRESS] };

		render(<LibraryScreen />);

		expect(capturedShouldShowStatus).toBe(false);
		expect(capturedShouldShowPurchaseStatus).toBe(true);
	});
});

// The cache key is what keeps the loaded pages — and therefore the scroll
// position — attached to the right query when returning from a media item.
describe("LibraryScreen infinite scroll cache key", () => {
	it("derives the key from the search the list ran with", () => {
		search = { statuses: [MediaItemStatus.COMPLETED] };
		settings = {
			defaultLibrarySortBy: "title",
			defaultLibrarySortDirection: "asc",
		};

		render(<LibraryScreen />);

		expect(capturedCacheKey).toContain("library:");
		expect(capturedCacheKey).toContain("title");
		expect(capturedCacheKey).toContain(MediaItemStatus.COMPLETED);
	});

	it("gives two different searches two different keys", () => {
		search = { statuses: [MediaItemStatus.COMPLETED] };
		render(<LibraryScreen />);
		const completedKey = capturedCacheKey;

		cleanup();
		search = { statuses: [MediaItemStatus.BACKLOG] };
		render(<LibraryScreen />);

		expect(capturedCacheKey).not.toBe(completedKey);
	});

	it("keeps the key stable across renders of an equivalent search", () => {
		search = { statuses: [MediaItemStatus.COMPLETED] };
		render(<LibraryScreen />);
		const firstKey = capturedCacheKey;

		cleanup();
		search = { statuses: [MediaItemStatus.COMPLETED] };
		render(<LibraryScreen />);

		expect(capturedCacheKey).toBe(firstKey);
	});

	// Reaching the library from the sidebar is a new history entry, so the pages
	// scrolled in on the previous visit must not come back with it.
	it("changes the key when the visit is a new history entry", () => {
		search = { statuses: [MediaItemStatus.COMPLETED] };
		render(<LibraryScreen />);
		const firstVisitKey = capturedCacheKey;

		cleanup();
		historyEntryKey = "entry-2";
		render(<LibraryScreen />);

		expect(capturedCacheKey).not.toBe(firstVisitKey);
	});

	// A navigation flips the router's location before the next screen renders, while
	// the library is still on screen. Reacting to that would reset the visible list
	// to page one and collapse the scroll container on the way into an item.
	it("keeps the key while the list is still mounted during a navigation away", () => {
		search = { statuses: [MediaItemStatus.COMPLETED] };
		const { rerender } = render(<LibraryScreen />);
		const mountedKey = capturedCacheKey;

		historyEntryKey = "entry-navigating-away";
		rerender(<LibraryScreen />);

		expect(capturedCacheKey).toBe(mountedKey);
	});

	// The key and the paged query have to describe the same list, or the cache
	// restores rows the fetch would never have returned.
	it("builds the key from the same search the sort defaults produced", () => {
		search = {};
		settings = {
			defaultLibrarySortBy: "rating",
			defaultLibrarySortDirection: "desc",
		};

		render(<LibraryScreen />);

		expect(capturedCacheKey).toContain("rating");
		expect(capturedCacheKey).toContain("desc");
	});
});
