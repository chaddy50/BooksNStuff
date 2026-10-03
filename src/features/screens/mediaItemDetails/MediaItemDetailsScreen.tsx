import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { DeleteButton } from "#/components/DeleteButton";
import { TopBar } from "#/features/navigation/topBar/TopBar";
import { History } from "./components/history/History";
import { Metadata } from "./components/metadata/Metadata";
import { RelatedItems } from "./components/relatedItems/RelatedItems";
import { removeFromLibrary } from "./mediaItemDetails";

// getRouteApi rather than importing Route directly: the route file imports this
// screen, so importing it back would be a cycle.
const route = getRouteApi(
	"/_authenticated/_details/mediaItemDetails/$mediaItemId",
);

export function MediaItemDetailsScreen() {
	const mediaItemDetails = route.useLoaderData();
	const { t } = useTranslation();
	const navigate = useNavigate();
	const [isDeleting, setIsDeleting] = useState(false);

	async function handleDelete() {
		setIsDeleting(true);
		try {
			await removeFromLibrary({
				data: { mediaItemId: mediaItemDetails.id },
			});
			await navigate({ to: "/" });
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<div className="min-h-screen bg-background text-foreground">
			<TopBar
				shouldShowBackButton
				right={
					<DeleteButton onClick={handleDelete} disabled={isDeleting}>
						{t("mediaItemDetails.removeFromLibrary")}
					</DeleteButton>
				}
			/>

			<div
				key={mediaItemDetails.id}
				className="px-4 md:px-6 py-8 max-w-5xl mx-auto"
			>
				<Metadata mediaItemDetails={mediaItemDetails} />
				<RelatedItems mediaItemDetails={mediaItemDetails} />
				<History
					mediaItemDetails={mediaItemDetails}
					isUnsavedChangesGuardEnabled={() => !isDeleting}
				/>
			</div>
		</div>
	);
}
