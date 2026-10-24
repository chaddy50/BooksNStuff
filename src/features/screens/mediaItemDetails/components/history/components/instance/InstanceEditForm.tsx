import {
	type Ref,
	useEffect,
	useId,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { AutoResizeTextarea } from "#/components/AutoResizeTextarea";
import { DeleteButton } from "#/components/DeleteButton";
import { useUserSettings } from "#/components/hooks/useUserSettings";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import type {
	ConsumptionInfo,
	FictionRating,
	SeasonReview,
	UserSettings,
} from "#/database/schema";
import { ConsumptionEditor } from "#/features/screens/mediaItemDetails/components/history/components/instance/ConsumptionEditor";
import { getDefaultMethod } from "#/features/screens/mediaItemDetails/components/history/components/instance/consumptionUtils";
import { RatingEditor } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/RatingEditor";
import { SeasonReviewRow } from "#/features/screens/mediaItemDetails/components/history/components/instance/SeasonReviewRow";
import {
	deleteInstance,
	type MediaItemDetails,
	saveInstance,
} from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { GameControlMethod, MediaItemType } from "#/lib/enums";
import { getLocalDateString, isDeepEqual } from "#/lib/utils";

export interface InstanceEditFormHandle {
	hasUnsavedChanges: () => boolean;
	save: () => Promise<boolean>;
}

interface InstanceEditFormProps {
	instance?: MediaItemDetails["instances"][number];
	mediaItemId: number;
	mediaItemType: MediaItemType;
	totalSeasons?: number;
	onSave: () => void;
	onCancel: () => void;
	ref?: Ref<InstanceEditFormHandle>;
}

/** The persisted fields of the form, compared against a baseline to detect edits. */
interface InstanceFormValues {
	rating: number;
	fictionRating: FictionRating | null;
	reviewText: string;
	startedAt: string;
	completedAt: string;
	progressPercent: string;
	consumptionInfo: ConsumptionInfo | null;
	seasonReviews: SeasonReview[];
}

function emptySeasonReview(season: number): SeasonReview {
	return { season, startedAt: "", completedAt: "", rating: 0, reviewText: "" };
}

// ---- Private helpers

function getInitialConsumptionInfo(
	mediaItemType: MediaItemType,
	instance: InstanceEditFormProps["instance"],
	settings: UserSettings | null,
): ConsumptionInfo | null {
	if (mediaItemType === MediaItemType.PODCAST) {
		return null;
	}
	if (instance?.consumptionInfo) {
		return instance.consumptionInfo;
	}
	if (mediaItemType === MediaItemType.VIDEO_GAME) {
		return {
			method: getDefaultMethod(mediaItemType, settings),
			controlMethod:
				settings?.defaultGameControlMethod ?? GameControlMethod.CONTROLLER,
		};
	}
	return { method: getDefaultMethod(mediaItemType, settings) };
}

function formatProgressPercentInput(
	progressPercent: number | null | undefined,
): string {
	return progressPercent != null ? String(progressPercent) : "";
}

function parseProgressPercentInput(value: string): number | undefined {
	return value ? Number(value) : undefined;
}

export function InstanceEditForm({
	instance,
	mediaItemId,
	mediaItemType,
	totalSeasons,
	onSave,
	onCancel,
	ref,
}: InstanceEditFormProps) {
	const { t } = useTranslation();
	const { data: settings } = useUserSettings();
	const hasInitializedConsumption = useRef(false);
	const formRootRef = useRef<HTMLDivElement | null>(null);
	const [rating, setRating] = useState<number>(instance?.rating ?? 0);
	const [fictionRating, setFictionRating] = useState<FictionRating | null>(
		instance?.fictionRating ?? null,
	);
	const [reviewText, setReviewText] = useState(instance?.reviewText ?? "");
	const [startedAt, setStartedAt] = useState(
		instance?.startedAt ??
			(instance === undefined ? getLocalDateString(new Date()) : ""),
	);
	const [completedAt, setCompletedAt] = useState(instance?.completedAt ?? "");
	const [progressPercent, setProgressPercent] = useState(
		formatProgressPercentInput(instance?.progressPercent),
	);
	const [consumptionInfo, setConsumptionInfo] =
		useState<ConsumptionInfo | null>(
			getInitialConsumptionInfo(mediaItemType, instance, null),
		);

	const [seasonReviews, setSeasonReviews] = useState<SeasonReview[]>(
		instance?.seasonReviews ?? [],
	);

	const currentValues: InstanceFormValues = {
		rating,
		fictionRating,
		reviewText,
		startedAt,
		completedAt,
		progressPercent,
		consumptionInfo,
		seasonReviews,
	};
	const baselineRef = useRef(currentValues);

	// Scrolling the form into view only ever needs to happen once, on mount —
	// not on every `instance` identity change. Only scroll when the form
	// isn't already fully visible, so opening a row the user can already see
	// doesn't jump the page.
	useEffect(() => {
		const element = formRootRef.current;
		if (!element) {
			return;
		}
		const rect = element.getBoundingClientRect();
		const isFullyInView = rect.top >= 0 && rect.bottom <= window.innerHeight;
		if (!isFullyInView) {
			element.scrollIntoView({ block: "nearest" });
		}
	}, []);

	useEffect(() => {
		if (settings === undefined || hasInitializedConsumption.current) {
			return;
		}
		if (instance?.consumptionInfo) {
			return;
		}

		hasInitializedConsumption.current = true;
		const defaultConsumptionInfo = getInitialConsumptionInfo(
			mediaItemType,
			instance,
			settings,
		);
		setConsumptionInfo(defaultConsumptionInfo);
		// The form filled this in from user settings, not the user
		baselineRef.current = {
			...baselineRef.current,
			consumptionInfo: defaultConsumptionInfo,
		};
	}, [settings, instance, mediaItemType]);

	const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(
		new Set(),
	);
	const [saving, setSaving] = useState(false);
	const dateError =
		startedAt && completedAt && completedAt < startedAt
			? t("mediaItemDetails.completedDateBeforeStartDateError")
			: null;
	const startedAtId = useId();
	const completedAtId = useId();
	const progressPercentId = useId();
	const reviewTextId = useId();
	const parsedProgressPercent = parseProgressPercentInput(progressPercent);

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
		const isCollapsing = expandedSeasons.has(season);

		setExpandedSeasons((previous) => {
			const next = new Set(previous);
			if (next.has(season)) {
				next.delete(season);
			} else {
				next.add(season);
			}
			return next;
		});

		if (isCollapsing && !startedAt) {
			const earliestSeasonStart = seasonReviews
				.map((r) => r.startedAt)
				.filter(Boolean)
				.sort()[0];
			if (earliestSeasonStart) {
				setStartedAt(earliestSeasonStart);
			}
		}
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

	async function onSaveInstance() {
		if (dateError) {
			return;
		}
		setSaving(true);
		try {
			await saveInstance({
				data: {
					mediaItemId: mediaItemId,
					instanceId: instance?.id,
					rating: rating !== null ? rating.toFixed(1) : undefined,
					fictionRating: fictionRating ?? undefined,
					reviewText: reviewText || undefined,
					startedAt: startedAt || undefined,
					completedAt: completedAt || undefined,
					progressPercent: parsedProgressPercent,
					seasonReviews: seasonReviews.length > 0 ? seasonReviews : undefined,
					consumptionInfo: consumptionInfo ?? undefined,
				},
			});
			baselineRef.current = currentValues;
			onSave();
		} finally {
			setSaving(false);
		}
	}

	async function onRemoveDetailedRating() {
		if (!instance?.id) {
			return;
		}
		setSaving(true);
		try {
			await saveInstance({
				data: {
					mediaItemId,
					instanceId: instance.id,
					rating: "0",
					reviewText: reviewText || undefined,
					startedAt: startedAt || undefined,
					completedAt: completedAt || undefined,
					progressPercent: parsedProgressPercent,
					seasonReviews: seasonReviews.length > 0 ? seasonReviews : undefined,
					consumptionInfo: consumptionInfo ?? undefined,
				},
			});
			baselineRef.current = {
				...currentValues,
				rating: 0,
				fictionRating: null,
			};
		} finally {
			setSaving(false);
		}
	}

	useImperativeHandle(ref, () => ({
		hasUnsavedChanges: () => !isDeepEqual(currentValues, baselineRef.current),
		save: async () => {
			if (dateError) {
				return false;
			}
			await onSaveInstance();
			return true;
		},
	}));

	async function onDeleteInstance() {
		if (!instance) return;
		setSaving(true);
		try {
			await deleteInstance({ data: { instanceId: instance.id } });
			onSave();
		} finally {
			setSaving(false);
		}
	}

	return (
		<div
			ref={formRootRef}
			className="p-4 rounded-lg border border-border bg-card flex flex-col gap-5"
		>
			{/* Dates */}
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
			<div className="flex flex-col gap-1.5">
				<label
					className="text-sm text-muted-foreground"
					htmlFor={progressPercentId}
				>
					{t("mediaItemDetails.progress")}
				</label>
				<Input
					id={progressPercentId}
					type="number"
					min={0}
					max={100}
					value={progressPercent}
					onChange={(e) => setProgressPercent(e.target.value)}
					className="w-16 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
				/>
			</div>
			{dateError && (
				<p className="text-sm text-destructive" data-testid="date-error">
					{dateError}
				</p>
			)}

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
				onRemoveDetailedRating={onRemoveDetailedRating}
				disabled={saving}
			/>

			{/* Review */}
			<div className="flex flex-col gap-1.5">
				<label className="text-sm text-muted-foreground" htmlFor={reviewTextId}>
					{t("mediaItemDetails.review")}
				</label>
				<AutoResizeTextarea
					id={reviewTextId}
					value={reviewText}
					onChange={(e) => setReviewText(e.target.value)}
					placeholder="Write your review..."
					minRows={6}
				/>
			</div>

			{/* Season Reviews */}
			{mediaItemType === MediaItemType.TV_SHOW && (
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
							onToggleExpanded={() => toggleExpandedSeason(seasonReview.season)}
							onChange={(patch) => updateSeasonReview(index, patch)}
							onRemove={() => removeSeasonReview(index)}
						/>
					))}
				</div>
			)}

			{/* Actions */}
			<div className="flex gap-2">
				<Button size="sm" onClick={onSaveInstance} disabled={saving}>
					{t("mediaItemDetails.save")}
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={onCancel}
					disabled={saving}
				>
					{t("mediaItemDetails.cancel")}
				</Button>
				{instance && (
					<DeleteButton
						className="ml-auto"
						onClick={onDeleteInstance}
						disabled={saving}
					>
						{t("mediaItemDetails.removeEntry")}
					</DeleteButton>
				)}
			</div>
		</div>
	);
}
