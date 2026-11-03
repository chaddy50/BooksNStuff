import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	horizontalListSortingStrategy,
	SortableContext,
} from "@dnd-kit/sortable";
import {
	type MouseEvent as ReactMouseEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "#/components/hooks/useToast";
import {
	type DashboardItem,
	reorderNextUpItems,
} from "#/features/screens/dashboard/dashboard";
import { NextUpCard } from "./NextUpCard";

interface NextUpSectionProps {
	title: string;
	items: DashboardItem[];
	emptyMessage: string;
	cardWidth: string;
}

/**
 * Restricts `MouseSensor` to a pointer-down that starts inside the card's
 * `data-drag-handle` element, no matter which DOM node the sortable listeners
 * are attached to. `TouchSensor` below keeps its default (unrestricted)
 * activator, so attaching listeners to the whole card still lets a
 * press-and-hold start a drag from anywhere on touch while a mouse drag can
 * only start from the hover-revealed handle.
 */
class HandleMouseSensor extends MouseSensor {
	static activators = [
		{
			eventName: "onMouseDown" as const,
			handler: ({ nativeEvent }: ReactMouseEvent) =>
				(nativeEvent.target as HTMLElement).closest("[data-drag-handle]") !==
				null,
		},
	];
}

/**
 * The dashboard's Next Up row, orderable by drag directly in place — no
 * separate "reorder mode" the way the custom-view grid has one. A failed
 * save reverts its own optimistic reorder, since there is no mode exit here
 * to re-sync the row from the server afterward.
 */
export function NextUpSection({
	title,
	items,
	emptyMessage,
	cardWidth,
}: NextUpSectionProps) {
	const { t } = useTranslation();
	const { toast } = useToast();
	const [orderedItems, setOrderedItems] = useState<DashboardItem[]>(items);
	const [activeId, setActiveId] = useState<number | null>(null);
	// Saves are chained rather than fired independently: each one rewrites the
	// whole saved order, so two in flight at once could land out of order and
	// leave the earlier drag's sequence as the winner.
	const pendingSaveRef = useRef<Promise<unknown>>(Promise.resolve());

	useEffect(() => {
		setOrderedItems(items);
	}, [items]);

	const sensors = useSensors(
		useSensor(HandleMouseSensor, { activationConstraint: { distance: 5 } }),
		// A press-and-hold, so a finger swipe still scrolls the row — same
		// constraint shape useSidebarDrag.ts relies on for the same reason.
		useSensor(TouchSensor, {
			activationConstraint: { delay: 200, tolerance: 8 },
		}),
	);

	const activeItem =
		activeId !== null
			? orderedItems.find((item) => item.id === activeId)
			: null;

	function handleDragStart(event: DragStartEvent) {
		setActiveId(event.active.id as number);
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		setActiveId(null);

		if (!over || active.id === over.id) {
			return;
		}

		const previousOrder = orderedItems;
		const oldIndex = orderedItems.findIndex((item) => item.id === active.id);
		const newIndex = orderedItems.findIndex((item) => item.id === over.id);
		const reordered = arrayMove(orderedItems, oldIndex, newIndex);

		setOrderedItems(reordered);
		pendingSaveRef.current = pendingSaveRef.current
			.then(() =>
				reorderNextUpItems({
					data: { orderedMediaItemIds: reordered.map((item) => item.id) },
				}),
			)
			.catch(() => {
				setOrderedItems(previousOrder);
				toast(t("dashboard.reorderNextUpFailed"), { variant: "destructive" });
			});
	}

	return (
		<section className="flex flex-col gap-2 w-full">
			<h2 className="text-xl font-semibold">{title}</h2>
			{orderedItems.length === 0 ? (
				<p className="text-muted-foreground">{emptyMessage}</p>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDragCancel={() => setActiveId(null)}
				>
					<SortableContext
						items={orderedItems.map((item) => item.id)}
						strategy={horizontalListSortingStrategy}
					>
						<div className="flex flex-row gap-4 overflow-x-auto">
							{orderedItems.map((item) => (
								<NextUpCard key={item.id} item={item} cardWidth={cardWidth} />
							))}
						</div>
					</SortableContext>
					<DragOverlay dropAnimation={null}>
						{activeItem ? (
							<NextUpCard item={activeItem} cardWidth={cardWidth} />
						) : null}
					</DragOverlay>
				</DndContext>
			)}
		</section>
	);
}
