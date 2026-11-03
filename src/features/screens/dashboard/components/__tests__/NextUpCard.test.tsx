import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DashboardItem } from "#/features/screens/dashboard/dashboard";
import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";
import { NextUpCard } from "../NextUpCard";

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

const baseItem: DashboardItem = {
	id: 1,
	status: MediaItemStatus.NEXT_UP,
	purchaseStatus: PurchaseStatus.NOT_PURCHASED,
	title: "Dune",
	type: MediaItemType.BOOK,
	coverImageUrl: null,
	seriesId: null,
	seriesName: null,
	rating: 0,
};

afterEach(() => {
	capturedCardProps = null;
	cleanup();
});

describe("NextUpCard", () => {
	it("renders the shared media item card", () => {
		render(<NextUpCard item={baseItem} cardWidth="w-40" />);

		expect(screen.getByTestId("media-item-card")).toBeInTheDocument();
	});

	it("keeps the card's details link enabled, unlike the custom-view reorder card", () => {
		render(<NextUpCard item={baseItem} cardWidth="w-40" />);

		expect(capturedCardProps?.shouldLinkToDetails).not.toBe(false);
	});

	it("labels the drag handle for screen readers", () => {
		render(<NextUpCard item={baseItem} cardWidth="w-40" />);

		expect(
			screen.getByText("dashboard.dragToReorderNextUp"),
		).toBeInTheDocument();
	});

	it("marks the drag handle with data-drag-handle", () => {
		render(<NextUpCard item={baseItem} cardWidth="w-40" />);

		const handleLabel = screen.getByText("dashboard.dragToReorderNextUp");
		expect(handleLabel.closest("[data-drag-handle]")).not.toBeNull();
	});
});
