import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { DeleteButton } from "#/components/DeleteButton";
import { DeleteConfirmationDialog } from "#/components/DeleteConfirmationDialog";
import { useDeleteConfirmation } from "#/components/hooks/useDeleteConfirmation";
import { TopBar } from "#/features/navigation/topBar/TopBar";
import { MissingSeriesItems } from "./components/MissingSeriesItems";
import { SeriesInfo } from "./components/SeriesInfo";
import { SeriesItems } from "./components/SeriesItems";
import { deleteSeries } from "./seriesDetails";

const route = getRouteApi("/_authenticated/_details/series/$seriesId");

export function SeriesDetailsScreen() {
	const seriesDetails = route.useLoaderData();
	const navigate = useNavigate();
	const { t } = useTranslation();
	const deleteConfirmation = useDeleteConfirmation({
		onDelete: async () => {
			await deleteSeries({ data: { seriesId: seriesDetails.id } });
			await navigate({ to: "/" });
		},
		failureMessage: t("seriesDetails.deleteFailed"),
	});

	return (
		<div className="min-h-screen bg-background text-foreground">
			<TopBar
				shouldShowBackButton
				right={
					<DeleteButton
						onClick={deleteConfirmation.requestDelete}
						disabled={deleteConfirmation.isDeleting}
					>
						{t("seriesDetails.delete")}
					</DeleteButton>
				}
			/>

			<DeleteConfirmationDialog
				isOpen={deleteConfirmation.isDialogOpen}
				title={t("seriesDetails.deleteTitle")}
				description={t("seriesDetails.deleteDescription", {
					name: seriesDetails.name,
				})}
				isDeleting={deleteConfirmation.isDeleting}
				errorMessage={deleteConfirmation.errorMessage}
				onCancel={deleteConfirmation.cancelDelete}
				onConfirm={deleteConfirmation.confirmDelete}
			/>

			<div className="px-6 py-8 max-w-5xl mx-auto">
				<SeriesInfo seriesDetails={seriesDetails} />
				<SeriesItems items={seriesDetails.items} />
				<MissingSeriesItems
					seriesId={seriesDetails.id}
					seriesType={seriesDetails.type}
				/>
			</div>
		</div>
	);
}
