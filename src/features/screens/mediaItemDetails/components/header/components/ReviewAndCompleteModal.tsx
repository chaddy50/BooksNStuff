import { type Ref, useImperativeHandle, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AutoResizeTextarea } from "#/components/AutoResizeTextarea";
import { useToast } from "#/components/hooks/useToast";
import { Button } from "#/components/ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogBody,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "#/components/ui/responsive-dialog";
import type { FictionRating, SeasonReview } from "#/database/schema";
import { RatingEditor } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/RatingEditor";
import { SeasonReviewsSection } from "#/features/screens/mediaItemDetails/components/SeasonReviewsSection";
import {
	toSaveableSeasonReviews,
	useSeasonReviewsEditor,
} from "#/features/screens/mediaItemDetails/components/useSeasonReviewsEditor";
import {
	type MediaItemDetails,
	type SeriesCompletionConfirmation,
	saveInstance,
} from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemType } from "#/lib/enums";
import { getLocalDateString, isDeepEqual } from "#/lib/utils";

export interface ReviewAndCompleteModalHandle {
	hasUnsavedChanges: () => boolean;
	save: () => Promise<boolean>;
}

interface ReviewAndCompleteModalProps {
	open: boolean;
	onClose: () => void;
	mediaItemId: number;
	mediaItemType: MediaItemType;
	totalSeasons?: number;
	instance: MediaItemDetails["instances"][number];
	onSaved: (confirmation: SeriesCompletionConfirmation | null) => void;
	onSeriesCompletionNeeded: (
		confirmation: SeriesCompletionConfirmation,
	) => void;
	ref?: Ref<ReviewAndCompleteModalHandle>;
}

interface ReviewFormValues {
	rating: number;
	fictionRating: FictionRating | null;
	reviewText: string;
	seasonReviews: SeasonReview[];
}

export function ReviewAndCompleteModal({
	open,
	onClose,
	mediaItemId,
	mediaItemType,
	totalSeasons,
	instance,
	onSaved,
	onSeriesCompletionNeeded,
	ref,
}: ReviewAndCompleteModalProps) {
	const { t } = useTranslation();
	const { toast } = useToast();
	const [rating, setRating] = useState(instance.rating);
	const [fictionRating, setFictionRating] = useState<FictionRating | null>(
		instance.fictionRating,
	);
	const [reviewText, setReviewText] = useState(instance.reviewText ?? "");
	const seasonReviewsEditor = useSeasonReviewsEditor(
		instance.seasonReviews ?? [],
		totalSeasons,
	);
	const [saving, setSaving] = useState(false);

	const currentValues: ReviewFormValues = {
		rating,
		fictionRating,
		reviewText,
		seasonReviews: seasonReviewsEditor.seasonReviews,
	};
	const baselineRef = useRef(currentValues);

	const isTvShow = mediaItemType === MediaItemType.TV_SHOW;

	function buildSaveData() {
		return {
			mediaItemId,
			instanceId: instance.id,
			rating: rating.toFixed(1),
			fictionRating: fictionRating ?? undefined,
			reviewText: reviewText || undefined,
			completedAt: getLocalDateString(new Date()),
			seasonReviews: toSaveableSeasonReviews(seasonReviewsEditor.seasonReviews),
			today: getLocalDateString(new Date()),
		};
	}

	async function handleMarkComplete() {
		setSaving(true);
		try {
			const confirmation = await saveInstance({ data: buildSaveData() });
			baselineRef.current = currentValues;
			onSaved(confirmation);
			if (confirmation) {
				onSeriesCompletionNeeded(confirmation);
			}
			onClose();
		} catch {
			toast(t("mediaItemDetails.saveFailed"), { variant: "destructive" });
		} finally {
			setSaving(false);
		}
	}

	useImperativeHandle(ref, () => ({
		hasUnsavedChanges: () => !isDeepEqual(currentValues, baselineRef.current),
		save: async () => {
			await handleMarkComplete();
			return true;
		},
	}));

	return (
		<ResponsiveDialog
			open={open}
			onOpenChange={(next) => !next && onClose()}
			showCloseButton={false}
		>
			<ResponsiveDialogHeader>
				<ResponsiveDialogTitle>
					{t("mediaItemDetails.reviewAndComplete")}
				</ResponsiveDialogTitle>
				<ResponsiveDialogDescription className="sr-only">
					{t("mediaItemDetails.reviewAndCompleteDescription")}
				</ResponsiveDialogDescription>
			</ResponsiveDialogHeader>

			<ResponsiveDialogBody className="flex flex-col gap-5">
				<RatingEditor
					rating={rating}
					fictionRating={fictionRating}
					onRatingChange={setRating}
					onFictionRatingChange={setFictionRating}
					disabled={saving}
				/>

				<AutoResizeTextarea
					value={reviewText}
					onChange={(e) => setReviewText(e.target.value)}
					placeholder="Write your review..."
					minRows={6}
				/>

				<SeasonReviewsSection
					isTvShow={isTvShow}
					totalSeasons={totalSeasons}
					editor={seasonReviewsEditor}
				/>
			</ResponsiveDialogBody>

			<ResponsiveDialogFooter>
				<Button variant="outline" onClick={onClose} disabled={saving}>
					{t("mediaItemDetails.cancel")}
				</Button>
				<Button onClick={handleMarkComplete} disabled={saving}>
					{t("mediaItemDetails.markComplete")}
				</Button>
			</ResponsiveDialogFooter>
		</ResponsiveDialog>
	);
}
