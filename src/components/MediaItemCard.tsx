import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RatingStars } from "#/features/screens/mediaItemDetails/components/history/components/instance/rating/ratingStars/RatingStars";
import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";
import { PurchasedBadge } from "./PurchasedBadge";
import { StatusBadge } from "./StatusBadge";
import { TypeBadge } from "./TypeBadge";

type MediaItemCardItem = {
	id: number;
	status: MediaItemStatus;
	purchaseStatus: PurchaseStatus;
	title: string;
	type: MediaItemType;
	coverImageUrl: string | null;
	rating: number;
	// Dashboard queries do not select this column, so it stays optional.
	expectedReleaseDate?: string | null;
	seriesId?: number | null | undefined;
	seriesName?: string | null | undefined;
	// Only ever set on an item the caller already knows is IN_PROGRESS.
	progressPercent?: number | null;
};

// Reaching any of these statuses means the item is already in hand, so whether
// it was purchased is no longer worth surfacing.
const CARD_CLASS_NAME =
	"group block bg-card rounded-lg overflow-hidden border border-border transition-colors self-start";

const STATUSES_IMPLYING_OWNERSHIP: MediaItemStatus[] = [
	MediaItemStatus.IN_PROGRESS,
	MediaItemStatus.ON_HOLD,
	MediaItemStatus.COMPLETED,
	MediaItemStatus.DROPPED,
];

interface MediaItemCardProps {
	mediaItem: MediaItemCardItem;
	shouldShowType?: boolean;
	shouldShowRating?: boolean;
	shouldShowPurchaseStatus?: boolean;
	shouldShowStatus?: boolean;
	shouldShowProgress?: boolean;
	shouldLinkToDetails?: boolean;
}

export function MediaItemCard({
	mediaItem,
	shouldShowType = true,
	shouldShowRating = true,
	shouldShowPurchaseStatus = true,
	shouldShowStatus = true,
	shouldShowProgress = true,
	shouldLinkToDetails = true,
}: MediaItemCardProps) {
	const { t } = useTranslation();
	const shouldShowRatingStars =
		shouldShowRating && mediaItem.status === MediaItemStatus.COMPLETED;
	const shouldShowPurchasedBadge =
		shouldShowPurchaseStatus &&
		mediaItem.purchaseStatus === PurchaseStatus.PURCHASED &&
		!STATUSES_IMPLYING_OWNERSHIP.includes(mediaItem.status);
	// Backlog is the default resting status, so it would badge nearly every card.
	const shouldShowStatusBadge =
		shouldShowStatus && mediaItem.status !== MediaItemStatus.BACKLOG;
	const isPodcast = mediaItem.type === MediaItemType.PODCAST;
	const progressPercent = mediaItem.progressPercent ?? null;
	const shouldShowProgressBar =
		shouldShowProgress &&
		mediaItem.status === MediaItemStatus.IN_PROGRESS &&
		progressPercent !== null;

	const cardContent = (
		<div className="aspect-2/3 w-full bg-muted relative">
			{mediaItem.coverImageUrl ? (
				<img
					src={mediaItem.coverImageUrl}
					alt={mediaItem.title}
					className={`absolute inset-0 w-full h-full ${isPodcast ? "object-contain" : "object-fill"}`}
					onError={(e) => {
						e.currentTarget.style.display = "none";
					}}
				/>
			) : (
				<div className="absolute inset-0 w-full h-full flex items-center justify-center text-muted-foreground text-sm">
					No Cover
				</div>
			)}

			{/* A 1:1 podcast cover contained in a 2:3 card leaves a sixth of the
			    card empty above the image, which is where the title goes. */}
			{isPodcast && (
				<div className="absolute inset-x-0 top-0 h-1/6 flex items-center justify-center px-1.5">
					<span className="text-sm leading-tight font-medium text-center line-clamp-2">
						{mediaItem.title}
					</span>
				</div>
			)}

			{shouldShowRatingStars && (
				<div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/70 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
			)}

			<div className="absolute inset-x-0 bottom-0 flex flex-col items-end">
				{(shouldShowStatusBadge ||
					shouldShowPurchasedBadge ||
					shouldShowType) && (
					<div className="flex flex-row items-center gap-1.5 mr-1.5 mb-1.5">
						{shouldShowPurchasedBadge && (
							<PurchasedBadge
								purchaseStatus={mediaItem.purchaseStatus}
								isOnDarkBackground
							/>
						)}

						{shouldShowStatusBadge && (
							<StatusBadge
								status={mediaItem.status}
								expectedReleaseDate={mediaItem.expectedReleaseDate}
								isOnDarkBackground
							/>
						)}

						{shouldShowType && (
							<TypeBadge
								type={mediaItem.type}
								className="bg-black/60 text-white backdrop-blur-sm"
							/>
						)}
					</div>
				)}

				{shouldShowRatingStars && (
					<div className="w-full grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr] [@media(hover:none)]:grid-rows-[1fr]">
						<div className="overflow-hidden">
							<RatingStars
								rating={mediaItem.rating}
								isOnDarkBackground
								starClassName="size-3.5"
								className="w-full justify-center py-1 bg-black/60 backdrop-blur-sm"
							/>
						</div>
					</div>
				)}

				{shouldShowProgressBar && progressPercent !== null && (
					<div
						role="progressbar"
						aria-valuenow={progressPercent}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-label={t("mediaItemDetails.progressComplete", {
							percent: progressPercent,
						})}
						className="w-full h-2.5 bg-black/60 backdrop-blur-sm border-t border-white/40"
					>
						<div
							className="h-full bg-[#a855f7]"
							style={{ width: `${progressPercent}%` }}
						/>
					</div>
				)}
			</div>
		</div>
	);

	if (!shouldLinkToDetails) {
		return <div className={CARD_CLASS_NAME}>{cardContent}</div>;
	}

	return (
		<Link
			to="/mediaItemDetails/$mediaItemId"
			params={{ mediaItemId: String(mediaItem.id) }}
			className={`${CARD_CLASS_NAME} hover:border-foreground/30`}
		>
			{cardContent}
		</Link>
	);
}
