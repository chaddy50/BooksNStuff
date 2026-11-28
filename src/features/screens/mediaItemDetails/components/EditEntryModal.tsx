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
import { SeasonReviewsSection } from "#/features/screens/mediaItemDetails/components/SeasonReviewsSection";
import {
	toSaveableSeasonReviews,
	useSeasonReviewsEditor,
} from "#/features/screens/mediaItemDetails/components/useSeasonReviewsEditor";
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

function undefinedIfEmpty(value: string): string | undefined {
	return value || undefined;
}

function emptyIfNullish(value: string | null | undefined): string {
	return value ?? "";
}

function getInitialConsumptionInfo(
	instance: EditEntryModalProps["instance"],
	mediaItemType: MediaItemType,
	settings: UserSettings | null | undefined,
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

	const [startedAt, setStartedAt] = useState(
		emptyIfNullish(instance.startedAt),
	);
	const [completedAt, setCompletedAt] = useState(
		emptyIfNullish(instance.completedAt),
	);
	const [consumptionInfo, setConsumptionInfo] =
		useState<ConsumptionInfo | null>(
			getInitialConsumptionInfo(instance, mediaItemType, settings),
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
	const [reviewText, setReviewText] = useState(
		emptyIfNullish(instance.reviewText),
	);
	const seasonReviewsEditor = useSeasonReviewsEditor(
		instance.seasonReviews ?? [],
		totalSeasons,
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
		seasonReviews: seasonReviewsEditor.seasonReviews,
	};
	const baselineRef = useRef(currentValues);

	const isTvShow = mediaItemType === MediaItemType.TV_SHOW;

	function buildSaveData() {
		return {
			mediaItemId,
			instanceId: instance.id,
			startedAt: undefinedIfEmpty(startedAt),
			completedAt: undefinedIfEmpty(completedAt),
			progressPercent: parseProgressInputValue(
				progressInputValue,
				effectivePageCount,
			),
			consumptionInfo: consumptionInfo ?? undefined,
			rating: rating.toFixed(1),
			fictionRating: fictionRating ?? undefined,
			reviewText: undefinedIfEmpty(reviewText),
			seasonReviews: toSaveableSeasonReviews(seasonReviewsEditor.seasonReviews),
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
		} catch {
			toast(t("mediaItemDetails.removeEntryFailed"), {
				variant: "destructive",
			});
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
				<div className="grid grid-cols-2 gap-x-4 gap-y-1.5 max-w-sm">
					<label
						className="text-sm text-muted-foreground"
						htmlFor={startedAtId}
					>
						{t("mediaItemDetails.started")}
					</label>
					<label
						className="text-sm text-muted-foreground"
						htmlFor={completedAtId}
					>
						{t("mediaItemDetails.completed")}
					</label>
					<Input
						id={startedAtId}
						type="date"
						value={startedAt}
						onChange={(e) => setStartedAt(e.target.value)}
					/>
					<Input
						id={completedAtId}
						type="date"
						value={completedAt}
						onChange={(e) => setCompletedAt(e.target.value)}
					/>
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

				<SeasonReviewsSection
					isTvShow={isTvShow}
					totalSeasons={totalSeasons}
					editor={seasonReviewsEditor}
				/>
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
