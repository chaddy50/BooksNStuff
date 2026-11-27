import { createFileRoute } from "@tanstack/react-router";

import { MediaItemDetailsScreen } from "#/features/screens/mediaItemDetails/MediaItemDetailsScreen";
import { getMediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";

export const Route = createFileRoute(
	"/_authenticated/_details/mediaItemDetails/$mediaItemId",
)({
	loader: ({ params }) =>
		getMediaItemDetails({ data: { id: parseInt(params.mediaItemId, 10) } }),
	component: MediaItemDetailsScreen,
});
