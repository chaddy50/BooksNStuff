import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Plus, Settings } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "#/components/ui/button";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import {
	buildSidebarEntries,
	type SidebarEntry,
} from "#/features/navigation/sidebar/sidebarLayout";
import { CreateViewDialog } from "#/features/screens/customView/CreateViewDialog";
import { getViews, type View } from "#/features/screens/customView/view";
import {
	getViewGroups,
	setViewGroupCollapsed,
} from "#/features/screens/customView/viewGroup";

interface NavDrawerProps {
	isOpen: boolean;
	onClose: () => void;
}

export function NavDrawer({ isOpen, onClose }: NavDrawerProps) {
	const { t } = useTranslation();
	const queryClient = useQueryClient();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	const { data: viewsList = [] } = useQuery({
		queryKey: ["views"],
		queryFn: () => getViews(),
	});
	const { data: groupsList = [] } = useQuery({
		queryKey: ["viewGroups"],
		queryFn: () => getViewGroups(),
	});

	// The same tree the sidebar builds — reusing it is what keeps the two from
	// drifting. The drawer only omits the dragging.
	const entries = buildSidebarEntries(viewsList, groupsList);
	const hasAnyViewsOrGroups = entries.length > 0;

	async function toggleGroupCollapsed(groupId: number, isCollapsed: boolean) {
		try {
			await setViewGroupCollapsed({ data: { id: groupId, isCollapsed } });
		} catch {
			// The caller cannot await this, so a rejection has to stop here. The
			// refetch below puts the chevron back in step with the server.
		}
		await queryClient.invalidateQueries({ queryKey: ["viewGroups"] });
	}

	return (
		<>
			<Sheet
				open={isOpen}
				onOpenChange={(open) => {
					if (!open) {
						onClose();
					}
				}}
			>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>{t("nav.menu")}</SheetTitle>
					</SheetHeader>
					<div className="flex flex-col overflow-y-auto flex-1">
						{hasAnyViewsOrGroups && (
							<div className="flex flex-col gap-0.5 px-4 py-3">
								<p className="px-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									{t("nav.views")}
								</p>
								{entries.map((entry) =>
									entry.kind === "view" ? (
										<NavDrawerViewLink
											key={`view-${entry.view.id}`}
											view={entry.view}
										/>
									) : (
										<NavDrawerGroup
											key={`group-${entry.group.id}`}
											entry={entry}
											onToggleCollapsed={() =>
												void toggleGroupCollapsed(
													entry.group.id,
													!entry.group.isCollapsed,
												)
											}
										/>
									),
								)}
								<Button
									variant="ghost"
									size="sm"
									className="w-full justify-start gap-2 mt-1"
									onClick={() => setIsCreateDialogOpen(true)}
								>
									<Plus className="size-4 shrink-0" />
									{t("views.newView")}
								</Button>
							</div>
						)}
						{!hasAnyViewsOrGroups && (
							<div className="px-4 py-3">
								<Button
									variant="ghost"
									size="sm"
									className="w-full justify-start gap-2"
									onClick={() => setIsCreateDialogOpen(true)}
								>
									<Plus className="size-4 shrink-0" />
									{t("views.newView")}
								</Button>
							</div>
						)}
						<div className="border-t border-border px-4 py-3 mt-auto">
							<SheetClose asChild>
								<Link
									to="/settings"
									className="flex items-center gap-2 px-2 py-3 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
									activeProps={{
										className: "bg-accent text-accent-foreground",
									}}
								>
									<Settings className="size-4 shrink-0" />
									{t("nav.settings")}
								</Link>
							</SheetClose>
						</div>
					</div>
				</SheetContent>
			</Sheet>
			<CreateViewDialog
				isOpen={isCreateDialogOpen}
				onClose={() => setIsCreateDialogOpen(false)}
			/>
		</>
	);
}

function NavDrawerViewLink({
	view,
	isNested,
}: {
	view: View;
	isNested?: boolean;
}) {
	return (
		<SheetClose asChild>
			<Link
				to="/views/$viewId"
				params={{ viewId: String(view.id) }}
				className={`flex items-center gap-2 px-2 py-3 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors${
					isNested ? " pl-6" : ""
				}`}
				activeProps={{
					className: "bg-accent text-accent-foreground",
				}}
			>
				{view.name}
			</Link>
		</SheetClose>
	);
}

function NavDrawerGroup({
	entry,
	onToggleCollapsed,
}: {
	entry: Extract<SidebarEntry, { kind: "group" }>;
	onToggleCollapsed: () => void;
}) {
	const { t } = useTranslation();
	const { group, views } = entry;

	return (
		<div className="flex flex-col gap-0.5">
			<button
				type="button"
				onClick={onToggleCollapsed}
				aria-expanded={!group.isCollapsed}
				aria-label={t(
					group.isCollapsed ? "viewGroups.expand" : "viewGroups.collapse",
					{ name: group.name },
				)}
				className="flex items-center gap-1 px-2 py-3 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
			>
				{group.isCollapsed ? (
					<ChevronRight className="size-3.5 shrink-0" />
				) : (
					<ChevronDown className="size-3.5 shrink-0" />
				)}
				<span className="truncate">{group.name}</span>
			</button>
			{!group.isCollapsed &&
				views.map((view) => (
					<NavDrawerViewLink key={view.id} view={view} isNested />
				))}
		</div>
	);
}
