import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { DeleteButton } from "#/components/DeleteButton";
import { DeleteConfirmationDialog } from "#/components/DeleteConfirmationDialog";
import { useDeleteConfirmation } from "#/components/hooks/useDeleteConfirmation";
import { TopBar } from "#/features/navigation/topBar/TopBar";
import { MediaItemDetailsHeader } from "./components/header/MediaItemDetailsHeader";
import { History } from "./components/history/History";
import { useInstanceEditingState } from "./components/history/useInstanceEditingState";
import { MediaItemDetailsTabStrip } from "./components/MediaItemDetailsTabStrip";
import { OverviewTab } from "./components/overview/OverviewTab";
import { RelatedItems } from "./components/relatedItems/RelatedItems";
import { removeFromLibrary } from "./mediaItemDetails";
import type { MediaItemDetailsTabId } from "./types";

// getRouteApi rather than importing Route directly: the route file imports this
// screen, so importing it back would be a cycle.
const route = getRouteApi(
	"/_authenticated/_details/mediaItemDetails/$mediaItemId",
);

export function MediaItemDetailsScreen() {
	const mediaItemDetails = route.useLoaderData();
	const { tab } = route.useSearch();
	const { t } = useTranslation();
	const navigate = useNavigate();
	const deleteConfirmation = useDeleteConfirmation({
		onDelete: async () => {
			await removeFromLibrary({ data: { mediaItemId: mediaItemDetails.id } });
			await navigate({ to: "/" });
		},
		failureMessage: t("mediaItemDetails.deleteFailed"),
	});
	const activeTabId: MediaItemDetailsTabId = tab ?? "overview";

	const editingState = useInstanceEditingState({
		isUnsavedChangesGuardEnabled: () => !deleteConfirmation.isDeleting,
	});

	function handleSelectTab(tabId: MediaItemDetailsTabId) {
		navigate({
			to: "/mediaItemDetails/$mediaItemId",
			params: { mediaItemId: String(mediaItemDetails.id) },
			search: { tab: tabId },
			resetScroll: false,
		});
	}

	function handleUpdateProgress(instanceId: number) {
		if (activeTabId !== "history") {
			handleSelectTab("history");
		}
		editingState.startEditing(instanceId);
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<TopBar
				shouldShowBackButton
				right={
					<DeleteButton
						onClick={deleteConfirmation.requestDelete}
						disabled={deleteConfirmation.isDeleting}
					>
						{t("mediaItemDetails.removeFromLibrary")}
					</DeleteButton>
				}
			/>

			<DeleteConfirmationDialog
				isOpen={deleteConfirmation.isDialogOpen}
				title={t("mediaItemDetails.deleteTitle")}
				description={t("mediaItemDetails.deleteDescription", {
					title: mediaItemDetails.title,
				})}
				isDeleting={deleteConfirmation.isDeleting}
				errorMessage={deleteConfirmation.errorMessage}
				onCancel={deleteConfirmation.cancelDelete}
				onConfirm={deleteConfirmation.confirmDelete}
			/>

			<div
				key={mediaItemDetails.id}
				className="px-4 md:px-6 py-8 max-w-5xl mx-auto flex flex-col gap-6"
			>
				<MediaItemDetailsHeader
					mediaItemDetails={mediaItemDetails}
					onUpdateProgress={handleUpdateProgress}
				/>

				<MediaItemDetailsTabStrip
					activeTabId={activeTabId}
					onSelect={handleSelectTab}
				/>

				<div
					role="tabpanel"
					id={`media-item-details-panel-${activeTabId}`}
					aria-labelledby={`media-item-details-tab-${activeTabId}`}
				>
					{activeTabId === "overview" && (
						<OverviewTab mediaItemDetails={mediaItemDetails} />
					)}
					{activeTabId === "history" && (
						<History
							mediaItemDetails={mediaItemDetails}
							editingState={editingState}
						/>
					)}
					{activeTabId === "related" && (
						<RelatedItems mediaItemDetails={mediaItemDetails} />
					)}
				</div>
			</div>
		</div>
	);
}
