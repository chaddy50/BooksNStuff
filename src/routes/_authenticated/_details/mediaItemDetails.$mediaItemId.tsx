import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { MediaItemDetailsScreen } from "#/features/screens/mediaItemDetails/MediaItemDetailsScreen";
import { getMediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MEDIA_ITEM_DETAILS_TAB_IDS } from "#/features/screens/mediaItemDetails/types";

const searchSchema = z.object({
	tab: z
		.enum(MEDIA_ITEM_DETAILS_TAB_IDS)
		.optional()
		.catch(() => undefined),
});

export const Route = createFileRoute(
	"/_authenticated/_details/mediaItemDetails/$mediaItemId",
)({
	validateSearch: searchSchema,
	loader: ({ params }) =>
		getMediaItemDetails({ data: { id: parseInt(params.mediaItemId, 10) } }),
	component: MediaItemDetailsScreen,
});
