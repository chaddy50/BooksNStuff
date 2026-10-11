import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";
import type { ItemQueryItem } from "#/lib/queries/types";
import { ReorderableItemGrid } from "../ReorderableItemGrid";

// jsdom cannot synthesize pointer-sensor drags, so DndContext is stubbed and the
// captured onDragEnd is invoked directly with a synthetic event.
let capturedOnDragEnd: ((event: unknown) => void) | null = null;
let capturedDropAnimation: unknown;
vi.mock("@dnd-kit/core", () => ({
	DndContext: ({
		children,
		onDragEnd,
	}: {
		children: React.ReactNode;
		onDragEnd: (event: unknown) => void;
	}) => {
		capturedOnDragEnd = onDragEnd;
		return <div>{children}</div>;
	},
	DragOverlay: ({
		children,
		dropAnimation,
	}: {
		children: React.ReactNode;
		dropAnimation?: unknown;
	}) => {
		capturedDropAnimation = dropAnimation;
		return <div>{children}</div>;
	},
	closestCenter: vi.fn(),
	PointerSensor: vi.fn(),
	useSensor: vi.fn(),
	useSensors: vi.fn(() => []),
}));

// arrayMove stays real — it is what the reordering assertions actually verify.
vi.mock("@dnd-kit/sortable", async () => {
	const actual =
		await vi.importActual<typeof import("@dnd-kit/sortable")>(
			"@dnd-kit/sortable",
		);
	return {
		arrayMove: actual.arrayMove,
		rectSortingStrategy: vi.fn(),
		SortableContext: ({ children }: { children: React.ReactNode }) => (
			<div>{children}</div>
		),
		useSortable: () => ({
			attributes: {},
			listeners: {},
			setNodeRef: vi.fn(),
			transform: null,
			transition: undefined,
			isDragging: false,
		}),
	};
});

const onReorder = vi.fn();

vi.mock("../ReorderableItemCard", () => ({
	ReorderableItemCard: ({ item }: { item: ItemQueryItem }) => (
		<div data-testid="card">{item.title}</div>
	),
}));

function makeItem(id: number, title: string): ItemQueryItem {
	return {
		id,
		status: MediaItemStatus.BACKLOG,
		purchaseStatus: PurchaseStatus.NOT_PURCHASED,
		expectedReleaseDate: null,
		title,
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
}

const items = [
	makeItem(1, "First"),
	makeItem(2, "Second"),
	makeItem(3, "Third"),
];

function renderedTitles() {
	return screen.getAllByTestId("card").map((card) => card.textContent);
}

beforeEach(() => {
	capturedOnDragEnd = null;
	capturedDropAnimation = undefined;
	onReorder.mockClear();
});

afterEach(cleanup);

describe("ReorderableItemGrid", () => {
	it("renders one card per item in the supplied order", () => {
		render(<ReorderableItemGrid items={items} onReorder={onReorder} />);

		expect(renderedTitles()).toEqual(["First", "Second", "Third"]);
	});

	it("reorders on screen without waiting for the caller to persist", () => {
		render(<ReorderableItemGrid items={items} onReorder={onReorder} />);

		act(() => {
			capturedOnDragEnd?.({ active: { id: 3 }, over: { id: 1 } });
		});

		expect(renderedTitles()).toEqual(["Third", "First", "Second"]);
	});

	it("reports the full reordered id list", () => {
		render(<ReorderableItemGrid items={items} onReorder={onReorder} />);

		act(() => {
			capturedOnDragEnd?.({ active: { id: 3 }, over: { id: 1 } });
		});

		expect(onReorder).toHaveBeenCalledWith([3, 1, 2]);
	});

	it("does nothing when the item is dropped outside the grid", () => {
		render(<ReorderableItemGrid items={items} onReorder={onReorder} />);

		act(() => {
			capturedOnDragEnd?.({ active: { id: 3 }, over: null });
		});

		expect(onReorder).not.toHaveBeenCalled();
		expect(renderedTitles()).toEqual(["First", "Second", "Third"]);
	});

	it("does nothing when the item is dropped on itself", () => {
		render(<ReorderableItemGrid items={items} onReorder={onReorder} />);

		act(() => {
			capturedOnDragEnd?.({ active: { id: 2 }, over: { id: 2 } });
		});

		expect(onReorder).not.toHaveBeenCalled();
		expect(renderedTitles()).toEqual(["First", "Second", "Third"]);
	});

	it("renders nothing for an empty item list", () => {
		render(<ReorderableItemGrid items={[]} onReorder={onReorder} />);

		expect(screen.queryAllByTestId("card")).toHaveLength(0);
	});
});

describe("ReorderableItemGrid drop animation", () => {
	// The bug this guards: dnd-kit's default drop animation flies the floating
	// clone back toward the card's original slot before the reordered grid is
	// revealed, so a dropped item appears to snap back and then move again.
	it("disables the drop animation", () => {
		render(<ReorderableItemGrid items={items} onReorder={onReorder} />);

		expect(capturedDropAnimation).toBeNull();
	});
});
