import { MediaItemStatus } from "#/lib/enums";

export type ProfileStats = {
	totalCount: number;
	completedCount: number;
	averageRating: number | null;
};

export function computeProfileStats(
	items: ReadonlyArray<{ status: MediaItemStatus; rating: number }>,
): ProfileStats {
	const completedCount = items.filter(
		(item) => item.status === MediaItemStatus.COMPLETED,
	).length;

	const ratedItems = items.filter((item) => item.rating > 0);
	const averageRating =
		ratedItems.length === 0
			? null
			: ratedItems.reduce((sum, item) => sum + item.rating, 0) /
				ratedItems.length;

	return {
		totalCount: items.length,
		completedCount,
		averageRating,
	};
}
