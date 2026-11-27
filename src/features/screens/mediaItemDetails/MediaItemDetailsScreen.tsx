import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { DeleteConfirmationDialog } from "#/components/DeleteConfirmationDialog";
import { useDeleteConfirmation } from "#/components/hooks/useDeleteConfirmation";
import { TopBar } from "#/features/navigation/topBar/TopBar";
import { MediaItemDetailsHeader } from "./components/header/MediaItemDetailsHeader";
import { History } from "./components/history/History";
import { OverviewTab } from "./components/overview/OverviewTab";
import { RelatedItems } from "./components/relatedItems/RelatedItems";
import { SeriesCompletionPromptDialog } from "./components/SeriesCompletionPromptDialog";
import { SetGenreDialog } from "./components/setGenre/SetGenreDialog";
import { useGenrePrompt } from "./components/setGenre/useGenrePrompt";
import { useInstanceEditorState } from "./components/useInstanceEditorState";
import { useSeriesCompletionPrompt } from "./components/useSeriesCompletionPrompt";
import { removeFromLibrary } from "./mediaItemDetails";
import { getPageCount, getTotalSeasons } from "./mediaItemDetailsHeader";

// getRouteApi rather than importing Route directly: the route file imports this
// screen, so importing it back would be a cycle.
const route = getRouteApi(
	"/_authenticated/_details/mediaItemDetails/$mediaItemId",
);

export function MediaItemDetailsScreen() {
	const mediaItemDetails = route.useLoaderData();
	const { t } = useTranslation();
	const navigate = useNavigate();
	const genrePrompt = useGenrePrompt({ genreId: mediaItemDetails.genreId });
	const deleteConfirmation = useDeleteConfirmation({
		onDelete: async () => {
			await removeFromLibrary({ data: { mediaItemId: mediaItemDetails.id } });
			await navigate({ to: "/" });
		},
		failureMessage: t("mediaItemDetails.deleteFailed"),
	});
	const completionPrompt = useSeriesCompletionPrompt();

	const editorState = useInstanceEditorState({
		isUnsavedChangesGuardEnabled: () => !deleteConfirmation.isDeleting,
	});
	const totalSeasons = getTotalSeasons(
		mediaItemDetails.type,
		mediaItemDetails.metadata,
	);
	const pageCount = getPageCount(
		mediaItemDetails.type,
		mediaItemDetails.metadata,
	);

	return (
		<div className="min-h-screen bg-background text-foreground">
			<TopBar shouldShowBackButton />

			<DeleteConfirmationDialog
				isOpen={deleteConfirmation.isDialogOpen}
				title={t("mediaItemDetails.deleteTitle")}
				description={t("mediaItemDetails.deleteDescription", {
					title: mediaItemDetails.title,
				})}
				isDeleting={deleteConfirmation.isDeleting}
				onCancel={deleteConfirmation.cancelDelete}
				onConfirm={deleteConfirmation.confirmDelete}
			/>

			<SeriesCompletionPromptDialog
				seriesName={completionPrompt.seriesName}
				isResolving={completionPrompt.isResolving}
				onMarkWaiting={completionPrompt.markWaiting}
				onMarkComplete={completionPrompt.markComplete}
			/>

			<SetGenreDialog
				isOpen={genrePrompt.isOpen}
				onClose={genrePrompt.close}
				mediaItemId={mediaItemDetails.id}
				suggestedGenres={genrePrompt.suggestedGenres}
			/>

			<div
				key={mediaItemDetails.id}
				className="px-4 md:px-6 py-8 max-w-5xl mx-auto flex flex-col gap-6"
			>
				<MediaItemDetailsHeader
					mediaItemDetails={mediaItemDetails}
					editorState={editorState}
					onSeriesCompletionNeeded={completionPrompt.promptSeriesCompletion}
					onRequestDelete={deleteConfirmation.requestDelete}
					isDeleting={deleteConfirmation.isDeleting}
				/>

				<OverviewTab mediaItemDetails={mediaItemDetails} />

				<History
					mediaItemDetails={mediaItemDetails}
					editorState={editorState}
					totalSeasons={totalSeasons}
					pageCount={pageCount}
					onSeriesCompletionNeeded={completionPrompt.promptSeriesCompletion}
				/>

				<RelatedItems mediaItemDetails={mediaItemDetails} />
			</div>
		</div>
	);
}
