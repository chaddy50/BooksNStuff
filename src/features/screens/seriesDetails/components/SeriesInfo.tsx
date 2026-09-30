import { Link, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ExpandableTextBlock } from "#/components/ExpandableTextBlock";
import { SeriesCompletionBadge } from "#/components/SeriesCompletionBadge";
import { TypeBadge } from "#/components/TypeBadge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { RatingStars } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/ratingStars/RatingStars";
import {
	type SeriesDetails,
	type SeriesItem,
	updateNextItemStatus,
	updateSeriesStatus,
} from "#/features/screens/seriesDetails/seriesDetails";
import { MediaItemStatus, NextItemStatus } from "#/lib/enums";
import { formatDate } from "#/lib/utils";
import { EditSeriesDialog } from "./EditSeriesDialog";

interface SeriesInfoProps {
	seriesDetails: SeriesDetails;
}

/**
 * Items are ordered by book/release number, not by when the user finished
 * them, so the series's completion date is the latest completedAt across all
 * items rather than the last item in that order.
 */
function getMostRecentCompletedAt(items: SeriesItem[]) {
	return items.reduce<string | null>((mostRecent, item) => {
		if (!item.completedAt) return mostRecent;
		if (!mostRecent || item.completedAt > mostRecent) return item.completedAt;
		return mostRecent;
	}, null);
}

export function SeriesInfo({ seriesDetails }: SeriesInfoProps) {
	const router = useRouter();
	const { t } = useTranslation();

	const hasUserCompletedAllItems = seriesDetails.items.every(
		(item) =>
			item.status === MediaItemStatus.COMPLETED ||
			item.status === MediaItemStatus.DROPPED,
	);
	const shouldShowNextItemStatus =
		!hasUserCompletedAllItems || !seriesDetails.isComplete;

	const firstItem = seriesDetails.items[0];
	const allItemsSameCreator =
		seriesDetails.items.length > 0 &&
		seriesDetails.items.every(
			(item) =>
				item.creatorId !== null && item.creatorId === firstItem?.creatorId,
		);
	const sharedCreator =
		allItemsSameCreator &&
		firstItem?.creatorId != null &&
		firstItem?.creatorName
			? { id: firstItem.creatorId, name: firstItem.creatorName }
			: null;

	const allItemsCompleted =
		seriesDetails.items.length > 0 &&
		seriesDetails.items.every(
			(item) => item.status === MediaItemStatus.COMPLETED,
		);
	const seriesCompletedAt =
		allItemsCompleted &&
		seriesDetails.status !== MediaItemStatus.WAITING_FOR_NEXT_RELEASE
			? getMostRecentCompletedAt(seriesDetails.items)
			: null;

	async function handleStatusChange(status: string) {
		await updateSeriesStatus({
			data: {
				seriesId: seriesDetails.id,
				status: status as MediaItemStatus,
			},
		});
		router.invalidate();
	}

	async function handleNextItemStatusChange(value: string) {
		await updateNextItemStatus({
			data: {
				seriesId: seriesDetails.id,
				nextItemStatus: value === "none" ? null : (value as NextItemStatus),
			},
		});
		router.invalidate();
	}

	return (
		<div className="flex flex-col gap-5 mb-10">
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-3 flex-wrap">
					<h1 className="text-3xl font-bold leading-tight">
						{seriesDetails.name}
					</h1>
					<span className="shrink-0">
						<TypeBadge type={seriesDetails.type} />
					</span>
					<SeriesCompletionBadge isComplete={seriesDetails.isComplete} />
				</div>
				<EditSeriesDialog seriesDetails={seriesDetails} />
			</div>

			{seriesDetails.description && (
				<ExpandableTextBlock text={seriesDetails.description} />
			)}

			{sharedCreator && (
				<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
					<span className="text-sm text-muted-foreground sm:w-24">
						{t("metadata.creator")}
					</span>
					<Link
						to="/creator/$creatorId"
						params={{ creatorId: String(sharedCreator.id) }}
						className="text-sm hover:underline"
					>
						{sharedCreator.name}
					</Link>
				</div>
			)}

			<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
				<span className="text-sm text-muted-foreground sm:w-24">
					{t("series.columns.status")}
				</span>
				<Select value={seriesDetails.status} onValueChange={handleStatusChange}>
					<SelectTrigger className="w-full sm:w-56">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{Object.values(MediaItemStatus).map((status) => (
							<SelectItem key={status} value={status}>
								{t(`status.${status}`)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{shouldShowNextItemStatus && (
				<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
					<span className="text-sm text-muted-foreground sm:w-24">
						{t("nextItemStatus.label")}
					</span>
					<Select
						value={seriesDetails.nextItemStatus ?? "none"}
						onValueChange={handleNextItemStatusChange}
					>
						<SelectTrigger className="w-full sm:w-56">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">—</SelectItem>
							{Object.values(NextItemStatus).map((status) => (
								<SelectItem key={status} value={status}>
									{t(`nextItemStatus.${status}`)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}

			{seriesDetails.status !== MediaItemStatus.DROPPED && (
				<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
					<span className="text-sm text-muted-foreground sm:w-24">
						{t("mediaItemDetails.rating")}
					</span>
					<RatingStars
						rating={seriesDetails.rating}
						shouldShowIfNoRating
						shouldShowValue
					/>
				</div>
			)}

			{seriesCompletedAt && (
				<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
					<span className="text-sm text-muted-foreground sm:w-24">
						{t("mediaItemDetails.completed")}
					</span>
					<span className="text-sm">{formatDate(seriesCompletedAt)}</span>
				</div>
			)}
		</div>
	);
}
