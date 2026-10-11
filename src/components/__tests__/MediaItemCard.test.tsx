import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaItemCard } from "#/components/MediaItemCard";
import { MediaItemList } from "#/components/MediaItemList";
import { TooltipProvider } from "#/components/ui/tooltip";
import { CreatorItems } from "#/features/screens/creatorDetails/components/CreatorItems";
import type { CreatorItem } from "#/features/screens/creatorDetails/creatorDetails";
import { DashboardSection } from "#/features/screens/dashboard/components/DashboardSection";
import type { DashboardItem } from "#/features/screens/dashboard/dashboard";
import { GenreItems } from "#/features/screens/genreDetails/components/GenreItems";
import type { LibraryItem } from "#/features/screens/library/library";
import { ReportDrilldownScreen } from "#/features/screens/reports/ReportDrilldownScreen";
import type { DrillDownItem } from "#/features/screens/reports/types";
import { SeriesItems } from "#/features/screens/seriesDetails/components/SeriesItems";
import type { SeriesItem } from "#/features/screens/seriesDetails/seriesDetails";
import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";
import type { GenreItem } from "#/lib/genres/genres";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

let drilldownItems: DrillDownItem[] = [];

// The card's own className is under test, so the stub has to forward it. The href
// is what gives the anchor its link role for getByRole.
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		className?: string;
	}) => (
		<a href="/mediaItemDetails" className={className}>
			{children}
		</a>
	),
	getRouteApi: () => ({
		useLoaderData: () => drilldownItems,
		useSearch: () => ({ key: "2026-01" }),
	}),
}));

vi.mock("#/features/navigation/topBar/TopBar", () => ({ TopBar: () => null }));

type BaseItem = {
	id: number;
	title: string;
	type: MediaItemType;
	coverImageUrl: string | null;
	rating: number;
	purchaseStatus: PurchaseStatus;
	status: MediaItemStatus;
	expectedReleaseDate?: string | null;
	progressPercent?: number | null;
};

const baseItem: BaseItem = {
	id: 1,
	title: "Dune",
	type: MediaItemType.BOOK,
	coverImageUrl: null,
	rating: 4,
	purchaseStatus: PurchaseStatus.NOT_PURCHASED,
	status: MediaItemStatus.BACKLOG,
};

function renderMediaItemCard(
	overrides: Partial<BaseItem & { seriesName: string }> & {
		shouldShowType?: boolean;
		shouldShowRating?: boolean;
		shouldShowPurchaseStatus?: boolean;
		shouldShowStatus?: boolean;
		shouldShowProgress?: boolean;
		shouldLinkToDetails?: boolean;
	} = {},
) {
	const {
		shouldShowType,
		shouldShowRating,
		shouldShowPurchaseStatus,
		shouldShowStatus,
		shouldShowProgress,
		shouldLinkToDetails,
		...itemOverrides
	} = overrides;
	return render(
		<TooltipProvider>
			<MediaItemCard
				mediaItem={{ ...baseItem, ...itemOverrides }}
				shouldShowType={shouldShowType}
				shouldShowRating={shouldShowRating}
				shouldShowPurchaseStatus={shouldShowPurchaseStatus}
				shouldShowStatus={shouldShowStatus}
				shouldShowProgress={shouldShowProgress}
				shouldLinkToDetails={shouldLinkToDetails}
			/>
		</TooltipProvider>,
	);
}

const NON_BACKLOG_STATUSES = [
	MediaItemStatus.NEXT_UP,
	MediaItemStatus.IN_PROGRESS,
	MediaItemStatus.ON_HOLD,
	MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
	MediaItemStatus.COMPLETED,
	MediaItemStatus.DROPPED,
];

afterEach(() => {
	cleanup();
	drilldownItems = [];
});

describe("MediaItemCard", () => {
	it("shows purchased badge by default when the item is purchased", () => {
		renderMediaItemCard({ purchaseStatus: PurchaseStatus.PURCHASED });
		expect(screen.getByTestId("purchased-badge")).toBeInTheDocument();
	});

	it("does not show purchased badge by default when the item is only wanted", () => {
		renderMediaItemCard({ purchaseStatus: PurchaseStatus.WANT_TO_BUY });
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	it("does not show purchased badge by default when the item is not purchased", () => {
		renderMediaItemCard({ purchaseStatus: PurchaseStatus.NOT_PURCHASED });
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	it("shows purchased badge when explicitly enabled", () => {
		renderMediaItemCard({
			shouldShowPurchaseStatus: true,
			purchaseStatus: PurchaseStatus.PURCHASED,
		});
		expect(screen.getByTestId("purchased-badge")).toBeInTheDocument();
	});

	it("does not show purchased badge when explicitly enabled but only wanted", () => {
		renderMediaItemCard({
			shouldShowPurchaseStatus: true,
			purchaseStatus: PurchaseStatus.WANT_TO_BUY,
		});
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	it("does not show purchased badge when explicitly enabled but not purchased", () => {
		renderMediaItemCard({
			shouldShowPurchaseStatus: true,
			purchaseStatus: PurchaseStatus.NOT_PURCHASED,
		});
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	// The opt-out the dashboard relies on to keep its sections badge-free.
	it("does not show purchased badge when explicitly disabled", () => {
		renderMediaItemCard({
			shouldShowPurchaseStatus: false,
			purchaseStatus: PurchaseStatus.PURCHASED,
		});
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	it.each([
		MediaItemStatus.IN_PROGRESS,
		MediaItemStatus.ON_HOLD,
		MediaItemStatus.COMPLETED,
		MediaItemStatus.DROPPED,
	])("hides the purchased badge for %s, which implies ownership", (status) => {
		renderMediaItemCard({ status, purchaseStatus: PurchaseStatus.PURCHASED });
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
	});

	it.each([
		MediaItemStatus.BACKLOG,
		MediaItemStatus.NEXT_UP,
		MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
	])("shows the purchased badge for %s, which does not", (status) => {
		renderMediaItemCard({ status, purchaseStatus: PurchaseStatus.PURCHASED });
		expect(screen.getByTestId("purchased-badge")).toBeInTheDocument();
	});

	it("shows rating stars when status is COMPLETED", () => {
		renderMediaItemCard({ status: MediaItemStatus.COMPLETED });
		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
	});

	it("does not show rating stars when status is IN_PROGRESS", () => {
		renderMediaItemCard({ status: MediaItemStatus.IN_PROGRESS });
		expect(screen.queryByTestId("rating-stars")).not.toBeInTheDocument();
	});

	it("shows the status badge by default", () => {
		renderMediaItemCard({ status: MediaItemStatus.IN_PROGRESS });
		expect(screen.getByTestId("status-badge")).toBeInTheDocument();
	});

	it.each(NON_BACKLOG_STATUSES)("shows the status badge for %s", (status) => {
		renderMediaItemCard({ status });
		expect(screen.getByTestId("status-badge")).toBeInTheDocument();
	});

	it("shows no status badge for a backlog item", () => {
		renderMediaItemCard({ status: MediaItemStatus.BACKLOG });
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
	});

	// Backlog is excluded unconditionally, so it outranks the visibility flag.
	it("shows no status badge for a backlog item even when explicitly enabled", () => {
		renderMediaItemCard({
			status: MediaItemStatus.BACKLOG,
			shouldShowStatus: true,
		});
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
	});

	it("shows no status badge when shouldShowStatus is false", () => {
		renderMediaItemCard({
			status: MediaItemStatus.IN_PROGRESS,
			shouldShowStatus: false,
		});
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
	});

	it("shows the status badge when explicitly enabled", () => {
		renderMediaItemCard({
			status: MediaItemStatus.IN_PROGRESS,
			shouldShowStatus: true,
		});
		expect(screen.getByTestId("status-badge")).toBeInTheDocument();
	});

	it("renders the status badge translucent on the card", () => {
		renderMediaItemCard({ status: MediaItemStatus.IN_PROGRESS });

		const badge = screen.getByTestId("status-badge");
		expect(badge).toHaveClass("bg-black/60", "text-white", "backdrop-blur-sm");
		expect(badge).not.toHaveClass("bg-blue-600");
	});

	// The badge row is gated on a combined condition; status alone must open it.
	it("shows the status badge when it is the only badge in the row", () => {
		renderMediaItemCard({
			status: MediaItemStatus.IN_PROGRESS,
			purchaseStatus: PurchaseStatus.NOT_PURCHASED,
			shouldShowType: false,
		});
		expect(screen.getByTestId("status-badge")).toBeInTheDocument();
	});

	it("renders the status badge between the purchased and type badges", () => {
		renderMediaItemCard({
			status: MediaItemStatus.NEXT_UP,
			purchaseStatus: PurchaseStatus.PURCHASED,
		});

		const statusBadge = screen.getByTestId("status-badge");
		expect(
			statusBadge.compareDocumentPosition(
				screen.getByTestId("purchased-badge"),
			) & Node.DOCUMENT_POSITION_PRECEDING,
		).toBeTruthy();
		expect(
			statusBadge.compareDocumentPosition(screen.getByTestId("type-badge")) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("matches the icon badges' height so the row lines up", () => {
		renderMediaItemCard({ status: MediaItemStatus.IN_PROGRESS });
		expect(screen.getByTestId("status-badge")).toHaveClass(
			"h-6.5",
			"inline-flex",
			"items-center",
		);
	});

	it("wraps the status badge in a tooltip trigger for a waiting item with a date", () => {
		renderMediaItemCard({
			status: MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
			expectedReleaseDate: "2024-06-01",
		});

		const badge = screen.getByTestId("status-badge");
		expect(badge).toHaveAttribute("data-slot", "tooltip-trigger");
		expect(badge).toHaveClass("bg-black/60");
	});

	// Dashboard-shaped items omit the column entirely.
	it("renders a waiting item with no expected release date", () => {
		renderMediaItemCard({
			status: MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
		});

		const badge = screen.getByTestId("status-badge");
		expect(badge).toBeInTheDocument();
		expect(badge).not.toHaveAttribute("data-slot", "tooltip-trigger");
	});

	it("shows the status badge alongside the rating stars for a completed item", () => {
		renderMediaItemCard({ status: MediaItemStatus.COMPLETED });

		expect(screen.getByTestId("status-badge")).toBeInTheDocument();
		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
	});

	it("does not show type badge when shouldShowType is false", () => {
		renderMediaItemCard({ shouldShowType: false });
		expect(screen.queryByTestId("type-badge")).not.toBeInTheDocument();
	});

	it("does not show rating stars when shouldShowRating is false, even when status is COMPLETED", () => {
		renderMediaItemCard({
			status: MediaItemStatus.COMPLETED,
			shouldShowRating: false,
		});
		expect(screen.queryByTestId("rating-stars")).not.toBeInTheDocument();
	});

	it("does not show series name even when seriesName is provided", () => {
		renderMediaItemCard({ seriesName: "The Expanse" });
		expect(screen.queryByText("The Expanse")).not.toBeInTheDocument();
	});

	it("shows a progress indicator for an in-progress item with a stored progressPercent", () => {
		renderMediaItemCard({
			status: MediaItemStatus.IN_PROGRESS,
			progressPercent: 30,
		});

		const progressBar = screen.getByRole("progressbar");
		expect(progressBar).toHaveAttribute("aria-valuenow", "30");
	});

	it("shows no progress indicator when progressPercent is not set", () => {
		renderMediaItemCard({
			status: MediaItemStatus.IN_PROGRESS,
			progressPercent: null,
		});

		expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
	});

	it("shows no progress indicator for a non-in-progress item even with a stored progressPercent", () => {
		renderMediaItemCard({
			status: MediaItemStatus.COMPLETED,
			progressPercent: 100,
		});

		expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
	});

	it("shows no progress indicator when shouldShowProgress is false", () => {
		renderMediaItemCard({
			status: MediaItemStatus.IN_PROGRESS,
			progressPercent: 30,
			shouldShowProgress: false,
		});

		expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
	});
});

const COVER_IMAGE_URL = "https://example.com/dune.jpg";

function getAspectBox() {
	const frameChild =
		screen.queryByAltText(baseItem.title) ?? screen.getByText("No Cover");
	const aspectBox = frameChild.parentElement;
	if (!aspectBox) {
		throw new Error("Expected the cover to be wrapped in an aspect box");
	}
	return aspectBox;
}

/**
 * jsdom runs no layout engine, so equal card heights cannot be measured directly.
 * These cases lock in the markup that makes the height a pure function of the
 * width instead: a block root, a full-width 2:3 frame, and nothing inside that
 * frame left in normal flow to size it from the cover art.
 */
describe("MediaItemCard details link", () => {
	it("links to the item by default", () => {
		renderMediaItemCard();

		expect(screen.getByRole("link")).toBeInTheDocument();
	});

	// Reorder mode renders these as drag targets, where a stray click that
	// navigated away would abandon the arrangement in progress.
	it("renders no link when linking is turned off", () => {
		renderMediaItemCard({ shouldLinkToDetails: false });

		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("keeps the card chrome when linking is turned off", () => {
		renderMediaItemCard({ shouldLinkToDetails: false });

		const card = getAspectBox().parentElement;
		expect(card).toHaveClass("bg-card");
		expect(card).toHaveClass("rounded-lg");
		expect(card).toHaveClass("border");
	});

	it("still renders the cover when linking is turned off", () => {
		renderMediaItemCard({
			coverImageUrl: COVER_IMAGE_URL,
			shouldLinkToDetails: false,
		});

		expect(screen.getByAltText(baseItem.title)).toBeInTheDocument();
	});
});

describe("MediaItemCard layout contract", () => {
	it("keeps every child of the aspect box out of flow when there is no cover", () => {
		renderMediaItemCard();

		const children = Array.from(getAspectBox().children);
		expect(children.length).toBeGreaterThan(0);
		for (const child of children) {
			expect(child).toHaveClass("absolute");
		}
	});

	it("keeps every child of the aspect box out of flow when there is a cover", () => {
		renderMediaItemCard({
			coverImageUrl: COVER_IMAGE_URL,
			status: MediaItemStatus.COMPLETED,
		});

		const children = Array.from(getAspectBox().children);
		expect(children.length).toBeGreaterThan(0);
		for (const child of children) {
			expect(child).toHaveClass("absolute");
		}
	});

	it("renders the root link as a block rather than a flex column", () => {
		renderMediaItemCard();

		const link = screen.getByRole("link");
		expect(link).toHaveClass("block");
		expect(link).not.toHaveClass("flex");
		expect(link).not.toHaveClass("flex-col");
	});

	it.each([
		["a cover", COVER_IMAGE_URL],
		["no cover", null],
	])("frames %s at full width in 2:3", (_, coverImageUrl) => {
		renderMediaItemCard({ coverImageUrl });

		expect(getAspectBox()).toHaveClass(
			"aspect-2/3",
			"w-full",
			"relative",
			"bg-muted",
		);
	});

	it("fills the frame with the cover image without letting it drive layout", () => {
		renderMediaItemCard({ coverImageUrl: COVER_IMAGE_URL });

		expect(screen.getByAltText(baseItem.title)).toHaveClass(
			"absolute",
			"inset-0",
			"w-full",
			"h-full",
		);
	});

	it("fills the frame with the placeholder without letting it drive layout", () => {
		renderMediaItemCard();

		expect(screen.getByText("No Cover")).toHaveClass(
			"absolute",
			"inset-0",
			"w-full",
			"h-full",
			"flex",
			"items-center",
			"justify-center",
		);
	});

	// A second in-flow sibling would reintroduce the content-driven height.
	it("gives the link the aspect box as its only child", () => {
		renderMediaItemCard({ coverImageUrl: COVER_IMAGE_URL });

		const link = screen.getByRole("link");
		expect(link.children).toHaveLength(1);
		expect(link.children[0]).toBe(getAspectBox());
	});

	it.each([
		MediaItemType.BOOK,
		MediaItemType.MOVIE,
		MediaItemType.TV_SHOW,
		MediaItemType.VIDEO_GAME,
		MediaItemType.PODCAST,
	])("frames a %s in the same 2:3 box", (type) => {
		renderMediaItemCard({ type, coverImageUrl: COVER_IMAGE_URL });

		const aspectBox = getAspectBox();
		expect(aspectBox).toHaveClass("aspect-2/3", "w-full");
		expect(aspectBox).not.toHaveClass("aspect-square");
	});

	it("letterboxes a podcast cover inside the 2:3 frame", () => {
		renderMediaItemCard({
			type: MediaItemType.PODCAST,
			coverImageUrl: COVER_IMAGE_URL,
		});

		const image = screen.getByAltText(baseItem.title);
		expect(image).toHaveClass(
			"absolute",
			"inset-0",
			"w-full",
			"h-full",
			"object-contain",
		);
		expect(image).not.toHaveClass("object-fill");
	});

	it.each([
		MediaItemType.BOOK,
		MediaItemType.MOVIE,
		MediaItemType.TV_SHOW,
		MediaItemType.VIDEO_GAME,
	])("stretches a %s cover to fill the frame", (type) => {
		renderMediaItemCard({ type, coverImageUrl: COVER_IMAGE_URL });

		const image = screen.getByAltText(baseItem.title);
		expect(image).toHaveClass("object-fill");
		expect(image).not.toHaveClass("object-contain");
	});

	it("keeps the cover image's src and alt text", () => {
		renderMediaItemCard({ coverImageUrl: COVER_IMAGE_URL });

		expect(screen.getByAltText(baseItem.title)).toHaveAttribute(
			"src",
			COVER_IMAGE_URL,
		);
	});

	it("hides a cover image that fails to load", () => {
		renderMediaItemCard({ coverImageUrl: COVER_IMAGE_URL });

		const image = screen.getByAltText(baseItem.title);
		fireEvent.error(image);

		expect(image.style.display).toBe("none");
	});

	// Hiding the image used to be able to collapse the frame along with it.
	it("keeps the frame after a cover image fails to load", () => {
		renderMediaItemCard({ coverImageUrl: COVER_IMAGE_URL });

		const aspectBox = getAspectBox();
		fireEvent.error(screen.getByAltText(baseItem.title));

		expect(aspectBox).toHaveClass("aspect-2/3", "w-full");
	});

	it("renders the badge row inside the frame", () => {
		renderMediaItemCard({
			status: MediaItemStatus.NEXT_UP,
			purchaseStatus: PurchaseStatus.PURCHASED,
		});

		const aspectBox = getAspectBox();
		for (const testId of ["purchased-badge", "status-badge", "type-badge"]) {
			expect(aspectBox).toContainElement(screen.getByTestId(testId));
		}
	});

	it("renders the rating stars inside the frame", () => {
		renderMediaItemCard({ status: MediaItemStatus.COMPLETED });

		expect(getAspectBox()).toContainElement(screen.getByTestId("rating-stars"));
	});

	it.each([
		[MediaItemStatus.COMPLETED, true],
		[MediaItemStatus.IN_PROGRESS, false],
	])("renders the hover gradient for %s: %s", (status, isGradientExpected) => {
		renderMediaItemCard({ status });

		const gradient = getAspectBox().querySelector(".bg-linear-to-t");
		expect(gradient !== null).toBe(isGradientExpected);
	});
});

/**
 * A superset of every calling surface's item shape, so one factory can feed all
 * of them. Each surface narrows it with a cast.
 */
type SurfaceItem = {
	id: number;
	title: string;
	type: MediaItemType;
	coverImageUrl: string | null;
	rating: number;
	status: MediaItemStatus;
	purchaseStatus: PurchaseStatus;
	expectedReleaseDate: null;
	completedAt: null;
	metadata: null;
	seriesId: null;
	seriesName: null;
	creatorId: null;
	creatorName: null;
	genreId: null;
	genreName: null;
	progressPercent: number | null;
};

function buildSurfaceItem(overrides: Partial<SurfaceItem> = {}): SurfaceItem {
	return {
		id: 1,
		title: "Dune",
		type: MediaItemType.BOOK,
		coverImageUrl: null,
		rating: 0,
		status: MediaItemStatus.BACKLOG,
		purchaseStatus: PurchaseStatus.NOT_PURCHASED,
		expectedReleaseDate: null,
		completedAt: null,
		metadata: null,
		seriesId: null,
		seriesName: null,
		creatorId: null,
		creatorName: null,
		genreId: null,
		genreName: null,
		progressPercent: null,
		...overrides,
	};
}

// Three cards with mixed cover art: enough to prove the frame contract does not
// depend on whether an item has a cover.
function buildMixedSurfaceItems(): SurfaceItem[] {
	return [
		buildSurfaceItem({ id: 1, title: "Dune", coverImageUrl: COVER_IMAGE_URL }),
		buildSurfaceItem({ id: 2, title: "Neuromancer", coverImageUrl: null }),
		buildSurfaceItem({
			id: 3,
			title: "Foundation",
			coverImageUrl: COVER_IMAGE_URL,
			type: MediaItemType.PODCAST,
		}),
	];
}

function renderInProvider(ui: React.ReactElement) {
	return render(<TooltipProvider>{ui}</TooltipProvider>);
}

const SURFACES: Array<[string, (items: SurfaceItem[]) => void]> = [
	[
		"MediaItemList",
		(items) =>
			renderInProvider(<MediaItemList items={items as LibraryItem[]} />),
	],
	[
		"DashboardSection",
		(items) =>
			renderInProvider(
				<DashboardSection
					title="dashboard.inProgress"
					items={items as DashboardItem[]}
					emptyMessage="dashboard.emptyInProgress"
				/>,
			),
	],
	[
		"SeriesItems",
		(items) => renderInProvider(<SeriesItems items={items as SeriesItem[]} />),
	],
	[
		"GenreItems",
		(items) => renderInProvider(<GenreItems items={items as GenreItem[]} />),
	],
	[
		"CreatorItems",
		(items) =>
			renderInProvider(<CreatorItems items={items as CreatorItem[]} />),
	],
	[
		"ReportDrilldownScreen",
		(items) => {
			drilldownItems = items as DrillDownItem[];
			renderInProvider(<ReportDrilldownScreen />);
		},
	],
];

function getAspectBoxes() {
	return screen.getAllByRole("link").map((link) => {
		const aspectBox = link.children[0];
		if (!aspectBox) {
			throw new Error("Expected the card link to wrap an aspect box");
		}
		return aspectBox;
	});
}

/**
 * The same layout contract, verified through every surface that renders a card,
 * since each passes its own props and wrapper width.
 */
describe("MediaItemCard layout contract across its calling surfaces", () => {
	it.each(SURFACES)(
		"%s frames a card with no cover at full width in 2:3",
		(_, renderSurface) => {
			renderSurface([buildSurfaceItem({ coverImageUrl: null })]);

			expect(screen.getByText("No Cover").parentElement).toHaveClass(
				"aspect-2/3",
				"w-full",
			);
		},
	);

	it.each(SURFACES)(
		"%s renders a cover image that cannot drive layout",
		(_, renderSurface) => {
			renderSurface([buildSurfaceItem({ coverImageUrl: COVER_IMAGE_URL })]);

			expect(screen.getByAltText("Dune")).toHaveClass(
				"absolute",
				"inset-0",
				"w-full",
				"h-full",
			);
		},
	);

	it.each(SURFACES)(
		"%s gives every card in the grid an identical frame",
		(_, renderSurface) => {
			renderSurface(buildMixedSurfaceItems());

			const aspectBoxes = getAspectBoxes();
			expect(aspectBoxes).toHaveLength(3);
			for (const aspectBox of aspectBoxes) {
				expect(aspectBox).toHaveClass("aspect-2/3", "w-full");
				for (const child of Array.from(aspectBox.children)) {
					expect(child).toHaveClass("absolute");
				}
			}
		},
	);

	// No single badge is common to every surface — SeriesItems opts out of the
	// type badge and DashboardSection out of the status badge — so this asserts
	// containment over whichever badges the surface does render.
	it.each(SURFACES)(
		"%s still renders its badges over the frame",
		(_, renderSurface) => {
			renderSurface([
				buildSurfaceItem({ status: MediaItemStatus.IN_PROGRESS }),
			]);

			const badges = [
				...screen.queryAllByTestId("status-badge"),
				...screen.queryAllByTestId("type-badge"),
				...screen.queryAllByTestId("purchased-badge"),
			];
			expect(badges.length).toBeGreaterThan(0);

			const [aspectBox] = getAspectBoxes();
			for (const badge of badges) {
				expect(aspectBox).toContainElement(badge);
			}
		},
	);

	// The narrowest wrapper of them all, so the most exposed to a cover image
	// sizing the card instead of the aspect ratio.
	it("keeps the dashboard scroll variant's card a block inside its fixed-width wrapper", () => {
		renderInProvider(
			<DashboardSection
				variant="scroll"
				title="dashboard.inProgress"
				items={
					[
						buildSurfaceItem({ coverImageUrl: COVER_IMAGE_URL }),
					] as DashboardItem[]
				}
				emptyMessage="dashboard.emptyInProgress"
			/>,
		);

		const link = screen.getByRole("link");
		expect(link).toHaveClass("block");
		expect(link.parentElement).toHaveClass("w-28", "shrink-0");
		expect(link.children[0]).toHaveClass("aspect-2/3", "w-full");
	});

	it("keeps the dashboard grid variant's frame", () => {
		renderInProvider(
			<DashboardSection
				variant="grid"
				title="dashboard.inProgress"
				items={
					[
						buildSurfaceItem({ coverImageUrl: COVER_IMAGE_URL }),
					] as DashboardItem[]
				}
				emptyMessage="dashboard.emptyInProgress"
			/>,
		);

		const [aspectBox] = getAspectBoxes();
		expect(aspectBox).toHaveClass("aspect-2/3", "w-full");
	});
});
