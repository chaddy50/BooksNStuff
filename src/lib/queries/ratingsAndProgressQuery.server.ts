import {
	fetchCurrentProgressByMediaItemId,
	getCurrentProgress,
} from "#/lib/queries/progressQuery.server";
import {
	fetchLatestRatingsByMediaItemId,
	getLatestRating,
	type LatestRating,
} from "#/lib/queries/ratingsQuery.server";

/**
 * Attaches each item's latest rating and current progress, fetched in parallel.
 * Shared by the genre, creator, and series detail screens, which all enrich
 * their item list the same way before computing profile stats.
 */
export async function attachRatingsAndProgress<T extends { id: number }>(
	items: T[],
): Promise<(T & LatestRating & { progressPercent: number | null })[]> {
	const itemIds = items.map((item) => item.id);
	const [latestRatings, currentProgress] = await Promise.all([
		fetchLatestRatingsByMediaItemId(itemIds),
		fetchCurrentProgressByMediaItemId(itemIds),
	]);

	return items.map((item) => ({
		...item,
		...getLatestRating(item.id, latestRatings),
		progressPercent: getCurrentProgress(item.id, currentProgress),
	}));
}
