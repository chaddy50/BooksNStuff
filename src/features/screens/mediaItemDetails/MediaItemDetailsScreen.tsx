import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { DeleteButton } from "#/components/DeleteButton";
import { DeleteConfirmationDialog } from "#/components/DeleteConfirmationDialog";
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
	const [isDeleting, setIsDeleting] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(
		null,
	);
	const activeTabId: MediaItemDetailsTabId = tab ?? "overview";

	const editingState = useInstanceEditingState({
		isUnsavedChangesGuardEnabled: () => !isDeleting,
	});

	async function handleConfirmDelete() {
		setIsDeleting(true);
		setDeleteErrorMessage(null);
		try {
			await removeFromLibrary({
				data: { mediaItemId: mediaItemDetails.id },
			});
			await navigate({ to: "/" });
		} catch {
			setDeleteErrorMessage(t("mediaItemDetails.deleteFailed"));
		} finally {
			setIsDeleting(false);
		}
	}

	function handleCancelDelete() {
		setIsDeleteDialogOpen(false);
		setDeleteErrorMessage(null);
	}

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
						onClick={() => setIsDeleteDialogOpen(true)}
						disabled={isDeleting}
					>
						{t("mediaItemDetails.removeFromLibrary")}
					</DeleteButton>
				}
			/>

			<DeleteConfirmationDialog
				isOpen={isDeleteDialogOpen}
				title={t("mediaItemDetails.deleteTitle")}
				description={t("mediaItemDetails.deleteDescription", {
					title: mediaItemDetails.title,
				})}
				isDeleting={isDeleting}
				errorMessage={deleteErrorMessage ?? undefined}
				onCancel={handleCancelDelete}
				onConfirm={handleConfirmDelete}
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
