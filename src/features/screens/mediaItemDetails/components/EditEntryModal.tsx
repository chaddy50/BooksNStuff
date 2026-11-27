import { type Ref, useId, useImperativeHandle, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AutoResizeTextarea } from "#/components/AutoResizeTextarea";
import { DeleteButton } from "#/components/DeleteButton";
import { useToast } from "#/components/hooks/useToast";
import { useUserSettings } from "#/components/hooks/useUserSettings";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	ResponsiveDialog,
	ResponsiveDialogBody,
	ResponsiveDialogDescription,
	ResponsiveDialogFooter,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "#/components/ui/responsive-dialog";
import type {
	ConsumptionInfo,
	FictionRating,
	SeasonReview,
	UserSettings,
} from "#/database/schema";
import { ConsumptionEditor } from "#/features/screens/mediaItemDetails/components/history/components/instance/ConsumptionEditor";
import { getDefaultConsumptionInfo } from "#/features/screens/mediaItemDetails/components/history/components/instance/consumptionUtils";
import { ProgressField } from "#/features/screens/mediaItemDetails/components/history/components/instance/ProgressField";
import {
	formatProgressInputValue,
	parseProgressInputValue,
	resolveEffectivePageCount,
} from "#/features/screens/mediaItemDetails/components/history/components/instance/progressInputUtils";
import { RatingEditor } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/RatingEditor";
import { SeasonReviewRow } from "#/features/screens/mediaItemDetails/components/history/components/instance/SeasonReviewRow";
import {
	deleteInstance,
	type MediaItemDetails,
	type SeriesCompletionConfirmation,
	saveInstance,
} from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemType } from "#/lib/enums";
import { getLocalDateString, isDeepEqual } from "#/lib/utils";

export interface EditEntryModalHandle {
	hasUnsavedChanges: () => boolean;
	save: () => Promise<boolean>;
}

interface EditEntryModalProps {
	open: boolean;
	onClose: () => void;
	mediaItemId: number;
	mediaItemType: MediaItemType;
	statusChangedAt: string | null;
	totalSeasons?: number;
	pageCount?: number;
	instance: MediaItemDetails["instances"][number];
	onSaved: (confirmation: SeriesCompletionConfirmation | null) => void;
	onSeriesCompletionNeeded: (
		confirmation: SeriesCompletionConfirmation,
	) => void;
	ref?: Ref<EditEntryModalHandle>;
}

interface EditEntryFormValues {
	startedAt: string;
	completedAt: string;
	progressInputValue: string;
	consumptionInfo: ConsumptionInfo | null;
	rating: number;
	fictionRating: FictionRating | null;
	reviewText: string;
	seasonReviews: SeasonReview[];
}

function emptySeasonReview(season: number): SeasonReview {
	return { season, startedAt: "", completedAt: "", rating: 0, reviewText: "" };
}

function getInitialConsumptionInfo(
	instance: EditEntryModalProps["instance"],
	mediaItemType: MediaItemType,
	settings: UserSettings | null,
): ConsumptionInfo | null {
	if (instance.consumptionInfo) return instance.consumptionInfo;
	return getDefaultConsumptionInfo(mediaItemType, settings);
}

export function EditEntryModal({
	open,
	onClose,
	mediaItemId,
	mediaItemType,
	totalSeasons,
	pageCount,
	instance,
	onSaved,
	onSeriesCompletionNeeded,
	ref,
}: EditEntryModalProps) {
	const { t } = useTranslation();
	const { toast } = useToast();
	const startedAtId = useId();
	const completedAtId = useId();
	const { data: settings } = useUserSettings();

	const [startedAt, setStartedAt] = useState(instance.startedAt ?? "");
	const [completedAt, setCompletedAt] = useState(instance.completedAt ?? "");
	const [consumptionInfo, setConsumptionInfo] =
		useState<ConsumptionInfo | null>(
			getInitialConsumptionInfo(instance, mediaItemType, settings ?? null),
		);
	const effectivePageCount = resolveEffectivePageCount(
		mediaItemType,
		pageCount,
		consumptionInfo?.method,
	);
	const [progressInputValue, setProgressInputValue] = useState(
		formatProgressInputValue(instance.progressPercent, effectivePageCount),
	);
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

	const currentValues: EditEntryFormValues = {
		startedAt,
		completedAt,
		progressInputValue,
		consumptionInfo,
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

	function buildSaveData() {
		return {
			mediaItemId,
			instanceId: instance.id,
			startedAt: startedAt || undefined,
			completedAt: completedAt || undefined,
			progressPercent: parseProgressInputValue(
				progressInputValue,
				effectivePageCount,
			),
			consumptionInfo: consumptionInfo ?? undefined,
			rating: rating.toFixed(1),
			fictionRating: fictionRating ?? undefined,
			reviewText: reviewText || undefined,
			seasonReviews: seasonReviews.length > 0 ? seasonReviews : undefined,
			today: getLocalDateString(new Date()),
		};
	}

	async function handleSave() {
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
			await handleSave();
			return true;
		},
	}));

	async function handleRemove() {
		setSaving(true);
		try {
			const confirmation = await deleteInstance({
				data: {
					instanceId: instance.id,
					today: getLocalDateString(new Date()),
				},
			});
			onSaved(confirmation);
			if (confirmation) {
				onSeriesCompletionNeeded(confirmation);
			}
			onClose();
		} finally {
			setSaving(false);
		}
	}

	return (
		<ResponsiveDialog open={open} onOpenChange={(next) => !next && onClose()}>
			<ResponsiveDialogHeader>
				<ResponsiveDialogTitle>
					{t("mediaItemDetails.editEntry")}
				</ResponsiveDialogTitle>
				<ResponsiveDialogDescription className="sr-only">
					{t("mediaItemDetails.editEntryDescription")}
				</ResponsiveDialogDescription>
			</ResponsiveDialogHeader>

			<ResponsiveDialogBody className="flex flex-col gap-5">
				<div className="grid grid-cols-2 gap-4 max-w-sm">
					<div className="flex flex-col gap-1.5">
						<label
							className="text-sm text-muted-foreground"
							htmlFor={startedAtId}
						>
							{t("mediaItemDetails.started")}
						</label>
						<Input
							id={startedAtId}
							type="date"
							value={startedAt}
							onChange={(e) => setStartedAt(e.target.value)}
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<label
							className="text-sm text-muted-foreground"
							htmlFor={completedAtId}
						>
							{t("mediaItemDetails.completed")}
						</label>
						<Input
							id={completedAtId}
							type="date"
							value={completedAt}
							onChange={(e) => setCompletedAt(e.target.value)}
						/>
					</div>
				</div>

				<ProgressField
					completedAt={completedAt}
					progressPercent={progressInputValue}
					onProgressPercentChange={setProgressInputValue}
					pageCount={effectivePageCount}
				/>

				<ConsumptionEditor
					mediaItemType={mediaItemType}
					value={consumptionInfo}
					onChange={setConsumptionInfo}
				/>

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
				<DeleteButton onClick={handleRemove} disabled={saving}>
					{t("mediaItemDetails.removeEntry")}
				</DeleteButton>
				<Button variant="outline" onClick={onClose} disabled={saving}>
					{t("mediaItemDetails.cancel")}
				</Button>
				<Button onClick={handleSave} disabled={saving}>
					{t("mediaItemDetails.save")}
				</Button>
			</ResponsiveDialogFooter>
		</ResponsiveDialog>
	);
}
