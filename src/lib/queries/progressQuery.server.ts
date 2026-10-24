import { and, desc, inArray, isNotNull, isNull } from "drizzle-orm";

import { db } from "#/database/index";
import { mediaItemInstances } from "#/database/schema";

/** Postgres numeric columns arrive as strings; null means no progress recorded. */
export function parseProgressPercentColumn(
	value: string | null | undefined,
): number | null {
	return value != null ? parseFloat(value) : null;
}

/**
 * Each media item's currently unfinished instance's progressPercent, keyed by
 * media item id. An item with no unfinished instance is simply absent from
 * the map.
 */
export async function fetchCurrentProgressByMediaItemId(
	mediaItemIds: number[],
): Promise<Map<number, number | null>> {
	if (mediaItemIds.length === 0) {
		return new Map();
	}

	const currentProgress = await db
		.selectDistinctOn([mediaItemInstances.mediaItemId], {
			mediaItemId: mediaItemInstances.mediaItemId,
			progressPercent: mediaItemInstances.progressPercent,
		})
		.from(mediaItemInstances)
		.where(
			and(
				inArray(mediaItemInstances.mediaItemId, mediaItemIds),
				isNotNull(mediaItemInstances.startedAt),
				isNull(mediaItemInstances.completedAt),
			),
		)
		.orderBy(mediaItemInstances.mediaItemId, desc(mediaItemInstances.id));

	return new Map(
		currentProgress.map((row) => [
			row.mediaItemId,
			parseProgressPercentColumn(row.progressPercent),
		]),
	);
}

export function getCurrentProgress(
	mediaItemId: number,
	currentProgress: Map<number, number | null>,
): number | null {
	return currentProgress.get(mediaItemId) ?? null;
}
