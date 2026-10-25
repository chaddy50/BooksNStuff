import { DndContext, DragOverlay } from "@dnd-kit/core";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	ChartColumn,
	FolderPlus,
	Layers,
	LayoutDashboard,
	Library,
	Plus,
	Settings,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "#/components/ui/button";
import { CreateViewDialog } from "#/features/screens/customView/CreateViewDialog";
import { getViews, type View } from "#/features/screens/customView/view";
import {
	getViewGroups,
	setViewGroupCollapsed,
	type ViewGroup,
} from "#/features/screens/customView/viewGroup";
import { DragOverlayRow } from "./components/DragOverlayRow";
import { DropIndicator } from "./components/DropIndicator";
import { SidebarGroupHeader } from "./components/SidebarGroupHeader";
import { SidebarItem } from "./components/SidebarItem";
import { SidebarRow } from "./components/SidebarRow";
import { ViewGroupDialog } from "./components/ViewGroupDialog";
import { buildSidebarEntries } from "./sidebarLayout";
import { type SidebarRow as Row, rowKey } from "./sidebarRows";
import { useSidebarDrag } from "./useSidebarDrag";
import { useSidebarKeyboardReorder } from "./useSidebarKeyboardReorder";

/** `null` when closed; a group means editing that one, `{}` means creating. */
type GroupDialogState = { group?: ViewGroup } | null;

export function Sidebar() {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [isCreateViewDialogOpen, setIsCreateViewDialogOpen] = useState(false);
	const [groupDialogState, setGroupDialogState] =
		useState<GroupDialogState>(null);

	const { data: viewsList } = useQuery({
		queryKey: ["views"],
		queryFn: () => getViews(),
	});
	const { data: groupsList } = useQuery({
		queryKey: ["viewGroups"],
		queryFn: () => getViewGroups(),
	});

	// The cache is the only home for the arrangement, so the tree is derived on
	// every render rather than mirrored into state a drag could desynchronise.
	const entries = useMemo(
		() => buildSidebarEntries(viewsList ?? [], groupsList ?? []),
		[viewsList, groupsList],
	);

	const {
		rows,
		sensors,
		activeRow,
		activeSlot,
		springOpenGroupIds,
		hasSaveFailed,
		saveLayout,
		listRef,
		rowNodes,
		registerRow,
		handleDragStart,
		handleDragMove,
		handleDragEnd,
		handleDragCancel,
	} = useSidebarDrag(entries);

	const keyboard = useSidebarKeyboardReorder({
		entries,
		rows,
		listRef,
		rowNodes,
		saveLayout,
	});

	const { viewsById, groupsById } = useMemo(
		() => indexEntries(entries),
		[entries],
	);

	function toggleGroupCollapsed(group: ViewGroup) {
		void setViewGroupCollapsed({
			data: { id: group.id, isCollapsed: !group.isCollapsed },
		})
			.catch(() => undefined)
			.finally(() => {
				void queryClient.invalidateQueries({ queryKey: ["viewGroups"] });
			});
	}

	return (
		<>
			<aside className="hidden md:flex w-56 border-r border-border shrink-0 bg-card flex-col">
				<div className="flex-1 flex flex-col overflow-hidden pt-4">
					<nav className="flex flex-col gap-0.5 px-2">
						<SidebarItem
							to="/"
							icon={<LayoutDashboard className="size-4 shrink-0" />}
							activeOptions={{ exact: true }}
						>
							{t("nav.dashboard")}
						</SidebarItem>
						<SidebarItem
							to="/library"
							icon={<Library className="size-4 shrink-0" />}
						>
							{t("nav.library")}
						</SidebarItem>
						<SidebarItem
							to="/series"
							icon={<Layers className="size-4 shrink-0" />}
						>
							{t("nav.series")}
						</SidebarItem>
						<SidebarItem
							to="/insights"
							icon={<ChartColumn className="size-4 shrink-0" />}
						>
							{t("nav.insights")}
						</SidebarItem>
					</nav>

					{/* Divides the fixed nav from the user's own views, in place of a
					    heading. Matches the rule above the add buttons. */}
					<div className="mx-2 my-2 border-t border-border" />

					<DndContext
						sensors={sensors}
						onDragStart={handleDragStart}
						onDragMove={handleDragMove}
						onDragEnd={handleDragEnd}
						onDragCancel={handleDragCancel}
					>
						{/* min-h-0 lets this shrink inside the flex column so it, and not
						    the page, is what scrolls once there are more views than fit.
						    relative anchors the drop indicator to the list's own box. */}
						<nav
							ref={listRef}
							className="relative flex flex-col gap-0.5 px-2 overflow-y-auto min-h-0"
						>
							{rows.map((row) => {
								if (row.kind === "view") {
									const view = viewsById.get(row.viewId);
									return view ? (
										<SidebarRow
											key={rowKey(row)}
											view={view}
											isNested={row.groupId !== null}
											registerRow={registerRow}
											onHandleKeyDown={keyboard.onHandleKeyDown(row)}
											onHandleBlur={keyboard.onHandleBlur(row)}
										/>
									) : null;
								}

								if (row.kind === "groupHeader") {
									const group = groupsById.get(row.groupId);
									return group ? (
										<SidebarGroupHeader
											key={rowKey(row)}
											group={group}
											viewCount={row.viewCount}
											isOpen={
												!group.isCollapsed || springOpenGroupIds.has(group.id)
											}
											registerRow={registerRow}
											onToggleCollapsed={() => toggleGroupCollapsed(group)}
											onEdit={() => setGroupDialogState({ group })}
											onHandleKeyDown={keyboard.onHandleKeyDown(row)}
											onHandleBlur={keyboard.onHandleBlur(row)}
										/>
									) : null;
								}

								return (
									// Registered like any other row: an empty group still needs
									// something to measure and aim a drop at. pl-8 lines its text
									// up with a nested view's label.
									<p
										key={rowKey(row)}
										ref={(node) => registerRow(rowKey(row), node)}
										className="pl-8 py-2 text-xs text-muted-foreground"
									>
										{t("viewGroups.empty")}
									</p>
								);
							})}

							<DropIndicator slot={activeSlot ?? keyboard.slot} />
						</nav>

						{/*
						 * Below the indicator's z-50, so the chip cannot hide the line.
						 *
						 * No drop animation: it would fly the chip back to the dragged
						 * row's node, and since nothing moves during a drag that node is
						 * still sitting where the drag began — so the drop read as a snap
						 * back to the start before the list repainted in its new order.
						 */}
						<DragOverlay zIndex={40} dropAnimation={null}>
							{activeRow ? (
								<DragOverlayRow
									name={nameOfRow(activeRow, viewsById, groupsById)}
								/>
							) : null}
						</DragOverlay>
					</DndContext>

					<p aria-live="polite" className="sr-only">
						{keyboard.announcement}
					</p>

					{hasSaveFailed && (
						<p className="px-2 py-1 text-xs text-destructive">
							{t("viewGroups.saveFailed")}
						</p>
					)}

					{/*
					 * Outside the scrolling list so the rule stays put as the sidebar
					 * fills up, rather than scrolling away with the last view.
					 */}
					<div className="mx-2 mt-1 pt-2 border-t border-border flex items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							className="flex-1 justify-start gap-1.5"
							onClick={() => setIsCreateViewDialogOpen(true)}
						>
							<Plus className="size-4 shrink-0" />
							{t("views.addButton")}
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="flex-1 justify-start gap-1.5"
							onClick={() => setGroupDialogState({})}
						>
							<FolderPlus className="size-4 shrink-0" />
							{t("viewGroups.addButton")}
						</Button>
					</div>

					<div className="mt-auto px-2 pb-2">
						<SidebarItem
							to="/settings"
							icon={<Settings className="size-4 shrink-0" />}
						>
							{t("nav.settings")}
						</SidebarItem>
					</div>
				</div>
			</aside>

			<CreateViewDialog
				isOpen={isCreateViewDialogOpen}
				onClose={() => setIsCreateViewDialogOpen(false)}
			/>

			{groupDialogState && (
				<ViewGroupDialog
					// Remounts on target change so the name field re-seeds from the group.
					key={groupDialogState.group?.id ?? "new"}
					group={groupDialogState.group}
					isOpen
					onClose={() => setGroupDialogState(null)}
				/>
			)}
		</>
	);
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Rows carry ids; rendering needs the records behind them. */
function indexEntries(entries: ReturnType<typeof buildSidebarEntries>) {
	const viewsById = new Map<number, View>();
	const groupsById = new Map<number, ViewGroup>();

	for (const entry of entries) {
		if (entry.kind === "view") {
			viewsById.set(entry.view.id, entry.view);
			continue;
		}
		groupsById.set(entry.group.id, entry.group);
		for (const view of entry.views) {
			viewsById.set(view.id, view);
		}
	}

	return { viewsById, groupsById };
}

function nameOfRow(
	row: Row,
	viewsById: Map<number, View>,
	groupsById: Map<number, ViewGroup>,
): string {
	if (row.kind === "view") {
		return viewsById.get(row.viewId)?.name ?? "";
	}
	return groupsById.get(row.groupId)?.name ?? "";
}
