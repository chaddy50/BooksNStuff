import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DashboardItem } from "#/features/screens/dashboard/dashboard";
import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";
import { NextUpSection } from "../NextUpSection";

// jsdom cannot synthesize pointer-sensor drags, so DndContext is stubbed and the
// captured onDragEnd is invoked directly with a synthetic event.
let capturedOnDragEnd: ((event: unknown) => void) | null = null;
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
	DragOverlay: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	closestCenter: vi.fn(),
	MouseSensor: vi.fn(),
	TouchSensor: vi.fn(),
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
		horizontalListSortingStrategy: vi.fn(),
		SortableContext: ({ children }: { children: React.ReactNode }) => (
			<div>{children}</div>
		),
	};
});

vi.mock("../NextUpCard", () => ({
	NextUpCard: ({ item }: { item: DashboardItem }) => (
		<div data-testid="card">{item.title}</div>
	),
}));

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const toast = vi.fn();
vi.mock("#/components/hooks/useToast", () => ({
	useToast: () => ({ toast }),
}));

const reorderNextUpItems = vi
	.fn<(args: { data: { orderedMediaItemIds: number[] } }) => Promise<void>>()
	.mockResolvedValue();
vi.mock("#/features/screens/dashboard/dashboard", () => ({
	reorderNextUpItems: (args: { data: { orderedMediaItemIds: number[] } }) =>
		reorderNextUpItems(args),
}));

function makeItem(id: number, title: string): DashboardItem {
	return {
		id,
		status: MediaItemStatus.NEXT_UP,
		purchaseStatus: PurchaseStatus.NOT_PURCHASED,
		title,
		type: MediaItemType.BOOK,
		coverImageUrl: null,
		seriesId: null,
		seriesName: null,
		rating: 0,
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

function renderSection(itemsToRender: DashboardItem[] = items) {
	return render(
		<NextUpSection
			title="dashboard.nextInSeries"
			items={itemsToRender}
			emptyMessage="dashboard.emptyNextInSeries"
			cardWidth="w-40"
		/>,
	);
}

beforeEach(() => {
	capturedOnDragEnd = null;
	toast.mockClear();
	reorderNextUpItems.mockClear();
	reorderNextUpItems.mockResolvedValue();
});

afterEach(cleanup);

describe("NextUpSection", () => {
	it("renders one card per item in the supplied order", () => {
		renderSection();

		expect(renderedTitles()).toEqual(["First", "Second", "Third"]);
	});

	it("renders the empty message and no cards for an empty list", () => {
		renderSection([]);

		expect(screen.getByText("dashboard.emptyNextInSeries")).toBeInTheDocument();
		expect(screen.queryAllByTestId("card")).toHaveLength(0);
	});

	it("reorders on screen and saves the full reordered id list", async () => {
		renderSection();

		await act(() => {
			capturedOnDragEnd?.({ active: { id: 3 }, over: { id: 1 } });
		});

		expect(renderedTitles()).toEqual(["Third", "First", "Second"]);
		expect(reorderNextUpItems).toHaveBeenCalledWith({
			data: { orderedMediaItemIds: [3, 1, 2] },
		});
	});

	it("does nothing when the item is dropped outside the row", async () => {
		renderSection();

		await act(() => {
			capturedOnDragEnd?.({ active: { id: 3 }, over: null });
		});

		expect(reorderNextUpItems).not.toHaveBeenCalled();
		expect(renderedTitles()).toEqual(["First", "Second", "Third"]);
	});

	it("reverts the order and shows a destructive toast when the save fails", async () => {
		reorderNextUpItems.mockRejectedValue(new Error("boom"));
		renderSection();

		await act(() => {
			capturedOnDragEnd?.({ active: { id: 3 }, over: { id: 1 } });
		});
		// Let the rejected promise's .catch handler run.
		await act(async () => {
			await Promise.resolve();
		});

		expect(renderedTitles()).toEqual(["First", "Second", "Third"]);
		expect(toast).toHaveBeenCalledWith("dashboard.reorderNextUpFailed", {
			variant: "destructive",
		});
	});

	it("saves two quick drags in the order they were dropped, not the order their saves resolve", async () => {
		let releaseFirstSave: (() => void) | undefined;
		reorderNextUpItems.mockReturnValueOnce(
			new Promise<void>((resolve) => {
				releaseFirstSave = resolve;
			}),
		);
		reorderNextUpItems.mockResolvedValueOnce();
		renderSection();

		await act(() => {
			capturedOnDragEnd?.({ active: { id: 3 }, over: { id: 1 } });
		});
		await act(() => {
			capturedOnDragEnd?.({ active: { id: 2 }, over: { id: 1 } });
		});

		expect(reorderNextUpItems).toHaveBeenCalledTimes(1);

		releaseFirstSave?.();
		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		expect(reorderNextUpItems).toHaveBeenNthCalledWith(1, {
			data: { orderedMediaItemIds: [3, 1, 2] },
		});
		expect(reorderNextUpItems).toHaveBeenNthCalledWith(2, {
			data: { orderedMediaItemIds: [3, 2, 1] },
		});
	});
});
