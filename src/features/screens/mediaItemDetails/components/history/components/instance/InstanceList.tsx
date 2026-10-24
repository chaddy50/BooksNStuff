import { useRouter } from "@tanstack/react-router";
import type { Ref, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemType } from "#/lib/enums";
import {
	InstanceEditForm,
	type InstanceEditFormHandle,
} from "./InstanceEditForm";
import { InstanceRow } from "./InstanceRow";

interface InstanceListProps {
	mediaItemDetails: MediaItemDetails;
	idBeingEdited: number | "new" | null;
	setIdBeingEdited: (value: SetStateAction<number | "new" | null>) => void;
	startEditing: (id: number | "new") => void;
	editorRef: Ref<InstanceEditFormHandle>;
}

function getTotalSeasons(
	mediaItemDetails: MediaItemDetails,
): number | undefined {
	if (mediaItemDetails.type !== MediaItemType.TV_SHOW) return undefined;
	return (mediaItemDetails.metadata as { seasons?: number })?.seasons;
}

function getPageCount(mediaItemDetails: MediaItemDetails): number | undefined {
	if (mediaItemDetails.type !== MediaItemType.BOOK) return undefined;
	return (mediaItemDetails.metadata as { pageCount?: number })?.pageCount;
}

export function InstanceList(props: InstanceListProps) {
	const {
		mediaItemDetails,
		idBeingEdited,
		setIdBeingEdited,
		startEditing,
		editorRef,
	} = props;
	const router = useRouter();
	const { t } = useTranslation();

	function onInstanceSaved() {
		router.invalidate();
		setIdBeingEdited(null);
	}

	if (mediaItemDetails.instances.length === 0 && idBeingEdited !== "new") {
		return (
			<p className="text-muted-foreground text-sm">
				{t("mediaItemDetails.noInstances")}
			</p>
		);
	}

	const mediaItemType = mediaItemDetails.type;
	const totalSeasons = getTotalSeasons(mediaItemDetails);
	const pageCount = getPageCount(mediaItemDetails);

	return (
		<div className="flex flex-col gap-3">
			{idBeingEdited === "new" && (
				<InstanceEditForm
					ref={editorRef}
					mediaItemId={mediaItemDetails.id}
					mediaItemType={mediaItemType}
					totalSeasons={totalSeasons}
					pageCount={pageCount}
					onSave={onInstanceSaved}
					onCancel={() => setIdBeingEdited(null)}
				/>
			)}

			{mediaItemDetails.instances.map((instance, idx) =>
				idBeingEdited === instance.id ? (
					<InstanceEditForm
						key={instance.id}
						ref={editorRef}
						instance={instance}
						mediaItemId={mediaItemDetails.id}
						mediaItemType={mediaItemType}
						totalSeasons={totalSeasons}
						pageCount={pageCount}
						onSave={onInstanceSaved}
						onCancel={() => setIdBeingEdited(null)}
					/>
				) : (
					<InstanceRow
						key={instance.id}
						index={idx + 1}
						instance={instance}
						onEdit={() => startEditing(instance.id)}
					/>
				),
			)}
		</div>
	);
}
