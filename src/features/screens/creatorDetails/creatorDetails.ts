import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/database/index";
import { creators } from "#/database/schema";
import { getLoggedInUser } from "#/features/screens/auth/session";
import {
	fetchCreatorDetails,
	updateCreatorMetadata as updateCreatorMetadataForUser,
} from "#/features/screens/creatorDetails/creatorDetails.server";

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const getCreatorListForUser = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getLoggedInUser();
		return db
			.select({ id: creators.id, name: creators.name })
			.from(creators)
			.where(eq(creators.userId, user.id))
			.orderBy(asc(creators.sortName));
	},
);

export const getCreatorDetails = createServerFn({ method: "GET" })
	.inputValidator(z.object({ id: z.number() }))
	.handler(async ({ data: { id } }) => {
		const user = await getLoggedInUser();
		return fetchCreatorDetails(id, user.id);
	});

export type CreatorDetails = Awaited<ReturnType<typeof getCreatorDetails>>;
export type CreatorItem = CreatorDetails["items"][number];

export const updateCreatorMetadata = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			creatorId: z.number(),
			name: z.string().min(1),
			biography: z.string().optional(),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return updateCreatorMetadataForUser(data, user.id);
	});

export const deleteCreator = createServerFn({ method: "POST" })
	.inputValidator(z.object({ creatorId: z.number() }))
	.handler(async ({ data: { creatorId } }) => {
		const user = await getLoggedInUser();
		await db
			.delete(creators)
			.where(and(eq(creators.id, creatorId), eq(creators.userId, user.id)));
	});
