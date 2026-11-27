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
import { SeasonReviewRow } from "#/features/screens/mediaItemDetails/components/history/components/instance/SeasonReviewRow";
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

function emptySeasonReview(season: number): SeasonReview {
	return { season, startedAt: "", completedAt: "", rating: 0, reviewText: "" };
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
	const [seasonReviews, setSeasonReviews] = useState<SeasonReview[]>(
		instance.seasonReviews ?? [],
	);
	const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(
		new Set(),
	);
	const [saving, setSaving] = useState(false);

	const currentValues: ReviewFormValues = {
		rating,
		fictionRating,
		reviewText,
		seasonReviews,
	};
	const baselineRef = useRef(currentValues);

	const isTvShow = mediaItemType === MediaItemType.TV_SHOW;
	const usedSeasons = new Set(seasonReviews.map((r) => r.season));
	const nextAvailableSeason = totalSeasons
		? Array.from({ length: totalSeasons }, (_, i) => i + 1).find(
				(s) => !usedSeasons.has(s),
			)
		: Math.max(0, ...seasonReviews.map((r) => r.season)) + 1 || 1;
	const allSeasonsAdded =
		totalSeasons !== undefined && seasonReviews.length >= totalSeasons;

	function addSeasonReview() {
		if (nextAvailableSeason === undefined) return;
		setSeasonReviews((previous) =>
			[...previous, emptySeasonReview(nextAvailableSeason)].sort(
				(a, b) => a.season - b.season,
			),
		);
		setExpandedSeasons(
			(previous) => new Set([...previous, nextAvailableSeason]),
		);
	}

	function toggleExpandedSeason(season: number) {
		setExpandedSeasons((previous) => {
			const next = new Set(previous);
			if (next.has(season)) {
				next.delete(season);
			} else {
				next.add(season);
			}
			return next;
		});
	}

	function updateSeasonReview(index: number, patch: Partial<SeasonReview>) {
		setSeasonReviews((previous) =>
			previous.map((review, i) =>
				i === index ? { ...review, ...patch } : review,
			),
		);
	}

	function removeSeasonReview(index: number) {
		setSeasonReviews((previous) => previous.filter((_, i) => i !== index));
	}

	async function handleMarkComplete() {
		setSaving(true);
		try {
			const confirmation = await saveInstance({
				data: {
					mediaItemId,
					instanceId: instance.id,
					rating: rating.toFixed(1),
					fictionRating: fictionRating ?? undefined,
					reviewText: reviewText || undefined,
					completedAt: getLocalDateString(new Date()),
					seasonReviews: seasonReviews.length > 0 ? seasonReviews : undefined,
					today: getLocalDateString(new Date()),
				},
			});
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

				{isTvShow && (
					<div className="flex flex-col gap-3">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">
								{t("mediaItemDetails.seasonReviews")}
							</span>
							<Button
								variant="outline"
								size="sm"
								onClick={addSeasonReview}
								disabled={allSeasonsAdded}
							>
								{t("mediaItemDetails.addSeasonReview")}
							</Button>
						</div>

						{seasonReviews.map((seasonReview, index) => (
							<SeasonReviewRow
								key={seasonReview.season}
								seasonReview={seasonReview}
								totalSeasons={totalSeasons}
								usedSeasons={usedSeasons}
								isExpanded={expandedSeasons.has(seasonReview.season)}
								onToggleExpanded={() =>
									toggleExpandedSeason(seasonReview.season)
								}
								onChange={(patch) => updateSeasonReview(index, patch)}
								onRemove={() => removeSeasonReview(index)}
							/>
						))}
					</div>
				)}
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
