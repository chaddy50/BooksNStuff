import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { DeleteButton } from "#/components/DeleteButton";
import { DeleteConfirmationDialog } from "#/components/DeleteConfirmationDialog";
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
	const [isDeleting, setIsDeleting] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(
		null,
	);

	async function handleConfirmDelete() {
		setIsDeleting(true);
		setDeleteErrorMessage(null);
		try {
			await deleteSeries({ data: { seriesId: seriesDetails.id } });
			await navigate({ to: "/" });
		} catch {
			setDeleteErrorMessage(t("seriesDetails.deleteFailed"));
		} finally {
			setIsDeleting(false);
		}
	}

	function handleCancelDelete() {
		setIsDeleteDialogOpen(false);
		setDeleteErrorMessage(null);
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
						{t("seriesDetails.delete")}
					</DeleteButton>
				}
			/>

			<DeleteConfirmationDialog
				isOpen={isDeleteDialogOpen}
				title={t("seriesDetails.deleteTitle")}
				description={t("seriesDetails.deleteDescription", {
					name: seriesDetails.name,
				})}
				isDeleting={isDeleting}
				errorMessage={deleteErrorMessage ?? undefined}
				onCancel={handleCancelDelete}
				onConfirm={handleConfirmDelete}
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
