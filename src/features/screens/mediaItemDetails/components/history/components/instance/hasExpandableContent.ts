import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";

export function hasExpandableContent(
	instance: MediaItemDetails["instances"][number],
): boolean {
	return (
		Boolean(instance.reviewText) ||
		Boolean(instance.fictionRating) ||
		Boolean(instance.seasonReviews?.length)
	);
}
