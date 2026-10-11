import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";
import type { ItemQueryItem } from "#/lib/queries/types";
import { ReorderableItemCard } from "../ReorderableItemCard";

let capturedCardProps: Record<string, unknown> | null = null;
vi.mock("#/components/MediaItemCard", () => ({
	MediaItemCard: (props: Record<string, unknown>) => {
		capturedCardProps = props;
		return <div data-testid="media-item-card" />;
	},
}));

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

// jsdom has no layout, so the real sortable hook has nothing to measure.
vi.mock("@dnd-kit/sortable", () => ({
	useSortable: () => ({
		attributes: {},
		listeners: {},
		setNodeRef: vi.fn(),
		transform: null,
		transition: undefined,
		isDragging: false,
	}),
}));

const baseItem: ItemQueryItem = {
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
};

afterEach(() => {
	capturedCardProps = null;
	cleanup();
});

describe("ReorderableItemCard", () => {
	it("renders the shared media item card", () => {
		render(<ReorderableItemCard item={baseItem} />);

		expect(screen.getByTestId("media-item-card")).toBeInTheDocument();
	});

	it("renders the card without its details link", () => {
		render(<ReorderableItemCard item={baseItem} />);

		expect(capturedCardProps?.shouldLinkToDetails).toBe(false);
	});

	it("passes the badge visibility flags through to the card", () => {
		render(
			<ReorderableItemCard
				item={baseItem}
				shouldShowPurchaseStatus={false}
				shouldShowStatus={false}
			/>,
		);

		expect(capturedCardProps?.shouldShowPurchaseStatus).toBe(false);
		expect(capturedCardProps?.shouldShowStatus).toBe(false);
	});

	// Navigating away mid-drag is exactly what reorder mode must not do.
	it("does not render a link to the item", () => {
		render(<ReorderableItemCard item={baseItem} />);

		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("labels the drag handle for screen readers", () => {
		render(<ReorderableItemCard item={baseItem} />);

		expect(screen.getByText("views.dragToReorder")).toBeInTheDocument();
	});
});
