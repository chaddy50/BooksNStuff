import { and, desc, inArray, isNotNull } from "drizzle-orm";

import { db } from "#/database/index";
import { mediaItemInstances } from "#/database/schema";

export type LatestRating = { rating: number; completedAt: string | null };

/**
 * Each media item's most recent completed instance, keyed by media item ID.
 * An item with no completed instance is simply absent from the map.
 */
export async function fetchLatestRatingsByMediaItemId(
	mediaItemIds: number[],
): Promise<Map<number, LatestRating>> {
	if (mediaItemIds.length === 0) {
		return new Map();
	}

	const latestRatings = await db
		.selectDistinctOn([mediaItemInstances.mediaItemId], {
			mediaItemId: mediaItemInstances.mediaItemId,
			rating: mediaItemInstances.rating,
			completedAt: mediaItemInstances.completedAt,
		})
		.from(mediaItemInstances)
		.where(
			and(
				inArray(mediaItemInstances.mediaItemId, mediaItemIds),
				isNotNull(mediaItemInstances.completedAt),
			),
		)
		.orderBy(mediaItemInstances.mediaItemId, desc(mediaItemInstances.id));

	return new Map(
		latestRatings.map((row) => [
			row.mediaItemId,
			{
				rating: parseFloat(row.rating ?? "") || 0,
				completedAt: row.completedAt,
			},
		]),
	);
}
