import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaItemList } from "#/components/MediaItemList";
import { TooltipProvider } from "#/components/ui/tooltip";
import type { LibraryItem } from "#/features/screens/library/library";
import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function makeItem(overrides: Partial<LibraryItem> = {}): LibraryItem {
	return {
		id: 1,
		status: MediaItemStatus.BACKLOG,
		purchaseStatus: PurchaseStatus.NOT_PURCHASED,
		expectedReleaseDate: null,
		title: "Dune",
		type: MediaItemType.BOOK,
		coverImageUrl: null,
		seriesId: null,
		seriesName: null,
		creatorId: null,
		creatorName: null,
		genreId: null,
		genreName: null,
		completedAt: null,
		rating: 0,
		progressPercent: null,
		...overrides,
	};
}

function renderMediaItemList(
	items: LibraryItem[],
	shouldShowPurchaseStatus?: boolean,
	shouldShowStatus?: boolean,
) {
	return render(
		<TooltipProvider>
			<MediaItemList
				items={items}
				shouldShowPurchaseStatus={shouldShowPurchaseStatus}
				shouldShowStatus={shouldShowStatus}
			/>
		</TooltipProvider>,
	);
}

afterEach(cleanup);

describe("MediaItemList", () => {
	it("shows an empty state when there are no items", () => {
		renderMediaItemList([]);

		expect(screen.getByText("views.empty")).toBeInTheDocument();
	});

	// Omitting the prop must reach MediaItemCard as undefined so its own default
	// decides — which is why this asserts through the real card, not a stub.
	it("shows badges when the prop is omitted", () => {
		renderMediaItemList([
			makeItem({ id: 1, purchaseStatus: PurchaseStatus.PURCHASED }),
			makeItem({ id: 2, purchaseStatus: PurchaseStatus.PURCHASED }),
		]);

		expect(screen.getAllByTestId("purchased-badge")).toHaveLength(2);
	});

	it("shows badges when the prop is true", () => {
		renderMediaItemList(
			[
				makeItem({ id: 1, purchaseStatus: PurchaseStatus.PURCHASED }),
				makeItem({ id: 2, purchaseStatus: PurchaseStatus.PURCHASED }),
			],
			true,
		);

		expect(screen.getAllByTestId("purchased-badge")).toHaveLength(2);
	});

	it("hides badges when the prop is false", () => {
		renderMediaItemList(
			[
				makeItem({ id: 1, purchaseStatus: PurchaseStatus.PURCHASED }),
				makeItem({ id: 2, purchaseStatus: PurchaseStatus.PURCHASED }),
			],
			false,
		);

		expect(screen.queryAllByTestId("purchased-badge")).toHaveLength(0);
	});

	it("badges only the purchased items", () => {
		renderMediaItemList(
			[
				makeItem({ id: 1, purchaseStatus: PurchaseStatus.PURCHASED }),
				makeItem({ id: 2, purchaseStatus: PurchaseStatus.WANT_TO_BUY }),
				makeItem({ id: 3, purchaseStatus: PurchaseStatus.NOT_PURCHASED }),
			],
			true,
		);

		expect(screen.getAllByTestId("purchased-badge")).toHaveLength(1);
	});

	it("shows status badges when the prop is omitted", () => {
		renderMediaItemList([
			makeItem({ id: 1, status: MediaItemStatus.IN_PROGRESS }),
			makeItem({ id: 2, status: MediaItemStatus.IN_PROGRESS }),
		]);

		expect(screen.getAllByTestId("status-badge")).toHaveLength(2);
	});

	it("shows status badges when the prop is true", () => {
		renderMediaItemList(
			[
				makeItem({ id: 1, status: MediaItemStatus.IN_PROGRESS }),
				makeItem({ id: 2, status: MediaItemStatus.IN_PROGRESS }),
			],
			undefined,
			true,
		);

		expect(screen.getAllByTestId("status-badge")).toHaveLength(2);
	});

	it("hides status badges when the prop is false", () => {
		renderMediaItemList(
			[
				makeItem({ id: 1, status: MediaItemStatus.IN_PROGRESS }),
				makeItem({ id: 2, status: MediaItemStatus.IN_PROGRESS }),
			],
			undefined,
			false,
		);

		expect(screen.queryAllByTestId("status-badge")).toHaveLength(0);
	});

	it("forwards the status and purchase flags independently", () => {
		renderMediaItemList(
			[
				makeItem({
					id: 1,
					status: MediaItemStatus.NEXT_UP,
					purchaseStatus: PurchaseStatus.PURCHASED,
				}),
				makeItem({
					id: 2,
					status: MediaItemStatus.NEXT_UP,
					purchaseStatus: PurchaseStatus.PURCHASED,
				}),
			],
			false,
			true,
		);

		expect(screen.getAllByTestId("status-badge")).toHaveLength(2);
		expect(screen.queryAllByTestId("purchased-badge")).toHaveLength(0);
	});

	it("shows no status badge for backlog items even when enabled", () => {
		renderMediaItemList(
			[
				makeItem({ id: 1, status: MediaItemStatus.BACKLOG }),
				makeItem({ id: 2, status: MediaItemStatus.BACKLOG }),
			],
			undefined,
			true,
		);

		expect(screen.queryAllByTestId("status-badge")).toHaveLength(0);
	});

	it("renders one card per item", () => {
		renderMediaItemList([
			makeItem({ id: 1, title: "Dune", coverImageUrl: "/dune.jpg" }),
			makeItem({ id: 2, title: "Neuromancer", coverImageUrl: "/neuro.jpg" }),
			makeItem({ id: 3, title: "Snow Crash", coverImageUrl: "/snow.jpg" }),
		]);

		expect(screen.getByAltText("Dune")).toBeInTheDocument();
		expect(screen.getByAltText("Neuromancer")).toBeInTheDocument();
		expect(screen.getByAltText("Snow Crash")).toBeInTheDocument();
	});
});
