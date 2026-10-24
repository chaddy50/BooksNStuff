import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { mediaTypeEnum } from "#/database/schema";
import * as itunes from "#/features/mediaItemSearch/api/itunes";
import {
	handleAddPodcastArc,
	handleAddToLibrary,
	handleCreateCustomItem,
	handleUpdatePodcastArcEpisodes,
	performMediaSearch,
} from "#/features/mediaItemSearch/mediaItemSearch.server";
import { typeSchema } from "#/features/mediaItemSearch/types";
import { getLoggedInUser } from "#/features/screens/auth/session";
import { MediaItemStatus } from "#/lib/enums";

export const searchMedia = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			query: z.string().min(1),
			type: typeSchema.default("all"),
		}),
	)
	.handler(async ({ data: { query, type } }) => {
		const user = await getLoggedInUser();
		return performMediaSearch(user.id, query, type);
	});

export const createCustomItem = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			type: z.enum(mediaTypeEnum.enumValues),
			title: z.string().min(1),
			description: z.string().optional(),
			coverImageUrl: z.string().optional(),
			releaseDate: z.string().optional(),
			metadata: z.record(z.string(), z.any()),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return handleCreateCustomItem(data, user.id);
	});

export const fetchEpisodesForFeed = createServerFn({ method: "GET" })
	.inputValidator(z.object({ feedUrl: z.string().url() }))
	.handler(async ({ data: { feedUrl } }) => {
		return itunes.fetchPodcastEpisodes(feedUrl);
	});

const arcMetadataSchema = z.object({
	creator: z.string().optional(),
	genres: z.array(z.string()).optional(),
	feedUrl: z.string().optional(),
	episodeNumbers: z.array(z.number()).optional(),
	episodeTitles: z.array(z.string()).optional(),
	episodeGuids: z.array(z.string()).optional(),
	totalDuration: z.number().optional(),
	firstPublishedAt: z.string().optional(),
	lastPublishedAt: z.string().optional(),
});

export const addPodcastArc = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			podcastTitle: z.string().min(1),
			podcastCoverImageUrl: z.string().optional(),
			arcTitle: z.string().min(1),
			arcMetadata: arcMetadataSchema,
			status: z.enum(
				Object.values(MediaItemStatus).filter(
					(statusValue) =>
						statusValue !== MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
				) as [string, ...string[]],
			),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return handleAddPodcastArc(
			{ ...data, status: data.status as MediaItemStatus },
			user.id,
		);
	});

export const updatePodcastArcEpisodes = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			mediaItemId: z.number(),
			arcTitle: z.string().min(1),
			arcMetadata: arcMetadataSchema,
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return handleUpdatePodcastArcEpisodes(data, user.id);
	});

export const addToLibrary = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			externalId: z.string(),
			externalSource: z.string(),
			type: z.enum(mediaTypeEnum.enumValues),
			title: z.string(),
			description: z.string().optional(),
			coverImageUrl: z.string().optional(),
			releaseDate: z.string().optional(),
			metadata: z.record(z.string(), z.any()),
		}),
	)
	.handler(async ({ data }) => {
		const user = await getLoggedInUser();
		return handleAddToLibrary(data, user.id);
	});
