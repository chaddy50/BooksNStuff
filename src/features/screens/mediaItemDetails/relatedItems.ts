import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getLoggedInUser } from "#/features/screens/auth/session";
import {
	addRelatedMediaItem as addRelatedMediaItemInDatabase,
	type getRelatedMediaItems as getRelatedMediaItemsFromDatabase,
	removeRelatedMediaItem as removeRelatedMediaItemInDatabase,
	searchLibraryForRelatedItems,
} from "#/features/screens/mediaItemDetails/relatedItems.server";

export type RelatedMediaItem = Awaited<
	ReturnType<typeof getRelatedMediaItemsFromDatabase>
>[number];

export type RelatedItemSearchResult = Awaited<
	ReturnType<typeof searchLibraryForRelatedItems>
>[number];

const relatedMediaItemInputSchema = z.object({
	mediaItemId: z.number().int(),
	relatedMediaItemId: z.number().int(),
});

export const searchRelatedItemCandidates = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({ query: z.string(), excludeMediaItemId: z.number().int() }),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return searchLibraryForRelatedItems(
			data.query,
			data.excludeMediaItemId,
			user.id,
		);
	});

export const addRelatedMediaItem = createServerFn({ method: "POST" })
	.inputValidator(relatedMediaItemInputSchema)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		await addRelatedMediaItemInDatabase(
			data.mediaItemId,
			data.relatedMediaItemId,
			user.id,
		);
	});

export const removeRelatedMediaItem = createServerFn({ method: "POST" })
	.inputValidator(relatedMediaItemInputSchema)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		await removeRelatedMediaItemInDatabase(
			data.mediaItemId,
			data.relatedMediaItemId,
			user.id,
		);
	});
