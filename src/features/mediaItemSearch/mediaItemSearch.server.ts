import { and, eq, inArray } from "drizzle-orm";

import { db } from "#/database/index";
import { mediaItems, series } from "#/database/schema";
import * as hardcover from "#/features/mediaItemSearch/api/hardcover";
import * as igdb from "#/features/mediaItemSearch/api/igdb";
import * as itunes from "#/features/mediaItemSearch/api/itunes";
import * as tmdb from "#/features/mediaItemSearch/api/tmdb";
import type { ExternalSearchResult } from "#/features/mediaItemSearch/api/types";
import { findOrCreateCreator } from "#/features/screens/creatorDetails/creatorDetails.server";
import { resolveCreatorName } from "#/lib/creator";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import { syncSeriesStatus } from "#/lib/queries/seriesQuery.server";
import type { SearchResultWithStatus } from "./types";

/**
 * Flattens settled API call results, silently dropping any that rejected.
 * This ensures a single failing external API does not suppress results from
 * the others.
 */
export function collectApiResults(
	settled: PromiseSettledResult<ExternalSearchResult[]>[],
): ExternalSearchResult[] {
	return settled.flatMap((result) =>
		result.status === "fulfilled" ? result.value : [],
	);
}

/**
 * Enriches external search results with the user's library status. Results
 * that exist in the user's library receive `mediaItemId` and `status`;
 * unrecognized results are returned unchanged.
 */
export function attachLibraryStatus(
	results: ExternalSearchResult[],
	existingItems: Array<{
		id: number;
		externalId: string;
		externalSource: string;
		status: MediaItemStatus;
	}>,
): SearchResultWithStatus[] {
	const itemByExternalKey = new Map(
		existingItems.map((item) => [
			`${item.externalId}:${item.externalSource}`,
			item,
		]),
	);

	return results.map((result): SearchResultWithStatus => {
		const item = itemByExternalKey.get(
			`${result.externalId}:${result.externalSource}`,
		);
		if (!item) return result;

		return { ...result, mediaItemId: item.id, status: item.status };
	});
}

export async function performMediaSearch(
	userId: string,
	query: string,
	type: "all" | MediaItemType,
): Promise<SearchResultWithStatus[]> {
	// Call relevant external APIs in parallel
	const apiCalls: Promise<ExternalSearchResult[]>[] = [];

	if (type === MediaItemType.BOOK || type === "all") {
		apiCalls.push(hardcover.search(query));
	}
	if (type === MediaItemType.MOVIE || type === "all") {
		apiCalls.push(
			tmdb.search(query, type === "all" ? "all" : MediaItemType.MOVIE),
		);
	} else if (type === MediaItemType.TV_SHOW) {
		apiCalls.push(tmdb.search(query, MediaItemType.TV_SHOW));
	}
	if (type === MediaItemType.VIDEO_GAME || type === "all") {
		apiCalls.push(igdb.search(query));
	}
	if (type === MediaItemType.PODCAST || type === "all") {
		apiCalls.push(itunes.searchPodcasts(query));
	}

	const resultArrays = await Promise.allSettled(apiCalls);
	const externalResults = collectApiResults(resultArrays);

	if (externalResults.length === 0) return [];

	// Check which results are already in this user's library
	const externalIds = externalResults.map((r) => r.externalId);
	const existingItems = await db
		.select({
			id: mediaItems.id,
			externalId: mediaItems.externalId,
			externalSource: mediaItems.externalSource,
			status: mediaItems.status,
		})
		.from(mediaItems)
		.where(
			and(
				eq(mediaItems.userId, userId),
				inArray(mediaItems.externalId, externalIds),
			),
		);

	return attachLibraryStatus(externalResults, existingItems);
}

export type AddToLibraryInput = {
	externalId: string;
	externalSource: string;
	type: MediaItemType;
	title: string;
	description?: string;
	coverImageUrl?: string;
	releaseDate?: string;
	metadata: Record<string, unknown>;
};

export async function handleAddToLibrary(
	data: AddToLibraryInput,
	userId: string,
): Promise<{ mediaItemId: number }> {
	const metadata = await enrichTmdbMetadata(
		data.externalId,
		data.externalSource,
		data.type,
		data.metadata,
	);

	const seriesName =
		typeof metadata.series === "string" ? metadata.series : null;
	const seriesId = seriesName
		? await findOrCreateSeriesForItem(
				seriesName,
				data.type,
				data.externalSource,
				userId,
			)
		: null;

	const creatorName = resolveCreatorName(data.type, metadata);
	let creatorId: number | null = null;
	if (creatorName) {
		const biography = await resolveCreatorBiography(
			creatorName,
			data.externalSource,
			metadata,
		);
		creatorId = await findOrCreateCreator(creatorName, userId, biography);
	}

	const [existingItem] = await db
		.select({
			id: mediaItems.id,
			seriesId: mediaItems.seriesId,
			creatorId: mediaItems.creatorId,
		})
		.from(mediaItems)
		.where(
			and(
				eq(mediaItems.userId, userId),
				eq(mediaItems.externalId, data.externalId),
				eq(mediaItems.externalSource, data.externalSource),
			),
		);

	if (existingItem) {
		const { backfilledSeriesId } = await backfillMissingRelations(
			existingItem.id,
			existingItem.seriesId,
			existingItem.creatorId,
			seriesId,
			creatorId,
		);
		if (backfilledSeriesId) {
			await syncSeriesStatus(backfilledSeriesId, userId);
		}
		return { mediaItemId: existingItem.id };
	}

	const mediaItemId = await insertLibraryEntry(
		userId,
		{
			type: data.type,
			title: data.title,
			description: data.description ?? null,
			coverImageUrl: data.coverImageUrl ?? null,
			releaseDate: data.releaseDate ?? null,
			externalId: data.externalId,
			externalSource: data.externalSource,
			metadata,
		},
		seriesId,
		creatorId,
	);
	if (seriesId) {
		await syncSeriesStatus(seriesId, userId);
	}
	return { mediaItemId };
}

export type PodcastArcMetadata = {
	creator?: string;
	genres?: string[];
	feedUrl?: string;
	episodeNumbers?: number[];
	episodeTitles?: string[];
	episodeGuids?: string[];
	totalDuration?: number;
	firstPublishedAt?: string;
	lastPublishedAt?: string;
};

export type AddPodcastArcInput = {
	podcastTitle: string;
	podcastCoverImageUrl?: string;
	arcTitle: string;
	arcMetadata: PodcastArcMetadata;
	status: MediaItemStatus;
};

export async function handleAddPodcastArc(
	data: AddPodcastArcInput,
	userId: string,
): Promise<{ mediaItemId: number }> {
	// Find or create the podcast series for this user
	const [existingSeries] = await db
		.select({ id: series.id })
		.from(series)
		.where(
			and(
				eq(series.name, data.podcastTitle),
				eq(series.type, MediaItemType.PODCAST),
				eq(series.userId, userId),
			),
		);

	let seriesId: number;
	if (existingSeries) {
		seriesId = existingSeries.id;
	} else {
		const [newSeries] = await db
			.insert(series)
			.values({
				userId,
				name: data.podcastTitle,
				type: MediaItemType.PODCAST,
				isComplete: false,
			})
			.returning({ id: series.id });
		if (!newSeries) throw new Error("Failed to create podcast series");
		seriesId = newSeries.id;
	}

	// Find or create a creator for this podcast arc
	let arcCreatorId: number | null = null;
	if (data.arcMetadata.creator) {
		let biography: string | null = null;
		if (data.arcMetadata.feedUrl) {
			const channelInfo = await itunes.fetchPodcastChannelInfo(
				data.arcMetadata.feedUrl,
			);
			biography = channelInfo?.description ?? null;
		}
		arcCreatorId = await findOrCreateCreator(
			data.arcMetadata.creator,
			userId,
			biography,
		);
	}

	// Compute a deterministic externalId so that re-adding the same arc is idempotent.
	// Primary key: sorted episode GUIDs (stable regardless of arc title).
	// Fallback: podcastTitle + arcTitle when GUIDs are not available.
	const externalId = data.arcMetadata.episodeGuids?.length
		? `itunes-arc-guids:${[...data.arcMetadata.episodeGuids].sort().join(",")}`
		: `itunes-arc:${data.podcastTitle}:${data.arcTitle}`;

	// Return early if the user already has this arc in their library
	const [existingItem] = await db
		.select({ id: mediaItems.id })
		.from(mediaItems)
		.where(
			and(
				eq(mediaItems.userId, userId),
				eq(mediaItems.externalId, externalId),
				eq(mediaItems.externalSource, "itunes"),
			),
		);

	if (existingItem) {
		return { mediaItemId: existingItem.id };
	}

	const mediaItemId = await insertLibraryEntry(
		userId,
		{
			type: MediaItemType.PODCAST,
			title: data.arcTitle,
			description: null,
			coverImageUrl: data.podcastCoverImageUrl ?? null,
			releaseDate: data.arcMetadata.firstPublishedAt ?? null,
			externalId,
			externalSource: "itunes",
			metadata: data.arcMetadata,
		},
		seriesId,
		arcCreatorId,
		data.status,
	);
	await syncSeriesStatus(seriesId, userId);
	return { mediaItemId };
}

export type CreateCustomItemInput = {
	type: MediaItemType;
	title: string;
	description?: string;
	coverImageUrl?: string;
	releaseDate?: string;
	metadata: Record<string, unknown>;
};

export async function handleCreateCustomItem(
	data: CreateCustomItemInput,
	userId: string,
): Promise<{ mediaItemId: number }> {
	const mediaItemId = await insertLibraryEntry(
		userId,
		{
			type: data.type,
			title: data.title,
			description: data.description ?? null,
			coverImageUrl: data.coverImageUrl ?? null,
			releaseDate: data.releaseDate ?? null,
			// A fresh UUID per custom item, so two users' custom items never collide
			// on the (userId, externalId, externalSource) unique index.
			externalId: crypto.randomUUID(),
			externalSource: "custom",
			metadata: data.metadata,
		},
		null,
		null,
	);
	return { mediaItemId };
}

export type UpdatePodcastArcEpisodesInput = {
	mediaItemId: number;
	arcTitle: string;
	arcMetadata: PodcastArcMetadata;
};

export async function handleUpdatePodcastArcEpisodes(
	data: UpdatePodcastArcEpisodesInput,
	userId: string,
): Promise<void> {
	const [ownedItem] = await db
		.select({ id: mediaItems.id })
		.from(mediaItems)
		.where(
			and(eq(mediaItems.id, data.mediaItemId), eq(mediaItems.userId, userId)),
		);

	if (!ownedItem) throw new Error("Unauthorized");

	await db
		.update(mediaItems)
		.set({
			title: data.arcTitle,
			releaseDate: data.arcMetadata.firstPublishedAt ?? null,
			metadata: data.arcMetadata,
		})
		.where(
			and(eq(mediaItems.id, data.mediaItemId), eq(mediaItems.userId, userId)),
		);
}

// ---- Private helpers

export async function enrichTmdbMetadata(
	externalId: string,
	externalSource: string,
	type: MediaItemType,
	metadata: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	if (externalSource === "tmdb" && type === MediaItemType.MOVIE) {
		const details = await tmdb.fetchMovieDetails(externalId);
		return { ...metadata, ...details };
	}
	if (externalSource === "tmdb" && type === MediaItemType.TV_SHOW) {
		const details = await tmdb.fetchTvShowDetails(externalId);
		return { ...metadata, ...details };
	}
	return metadata;
}

async function findOrCreateSeriesForItem(
	seriesName: string,
	type: MediaItemType,
	externalSource: string,
	userId: string,
): Promise<number> {
	const [existingSeries] = await db
		.select({ id: series.id })
		.from(series)
		.where(
			and(
				eq(series.name, seriesName),
				eq(series.type, type),
				eq(series.userId, userId),
			),
		);
	if (existingSeries) {
		return existingSeries.id;
	}

	const seriesInfo =
		externalSource === "hardcover"
			? await hardcover.fetchSeriesInfo(seriesName)
			: null;

	const [newSeries] = await db
		.insert(series)
		.values({
			userId,
			name: seriesName,
			type,
			description: seriesInfo?.description ?? null,
			isComplete: seriesInfo?.isComplete ?? false,
		})
		.returning({ id: series.id });
	if (!newSeries) throw new Error("Failed to create series");
	return newSeries.id;
}

export async function resolveCreatorBiography(
	creatorName: string,
	externalSource: string,
	metadata: Record<string, unknown>,
): Promise<string | null> {
	if (externalSource === "hardcover") {
		const bioResult = await hardcover.fetchCreatorBio(creatorName);
		return bioResult?.biography ?? null;
	}
	if (externalSource === "tmdb") {
		const bioResult = await tmdb.fetchCreatorBio(creatorName);
		return bioResult?.biography ?? null;
	}
	if (externalSource === "igdb") {
		const biography =
			typeof metadata.developerBio === "string" ? metadata.developerBio : null;
		// Strip transient developerBio so it is not persisted in metadata
		delete metadata.developerBio;
		return biography;
	}
	if (externalSource === "itunes" && typeof metadata.feedUrl === "string") {
		const channelInfo = await itunes.fetchPodcastChannelInfo(metadata.feedUrl);
		return channelInfo?.description ?? null;
	}
	return null;
}

async function backfillMissingRelations(
	itemId: number,
	existingSeriesId: number | null,
	existingCreatorId: number | null,
	newSeriesId: number | null,
	newCreatorId: number | null,
): Promise<{ backfilledSeriesId: number | null }> {
	const backfilledSeriesId =
		newSeriesId && !existingSeriesId ? newSeriesId : null;
	const updates: Record<string, unknown> = {};
	if (backfilledSeriesId) {
		updates.seriesId = backfilledSeriesId;
	}
	if (newCreatorId && !existingCreatorId) {
		updates.creatorId = newCreatorId;
	}
	if (Object.keys(updates).length > 0) {
		await db.update(mediaItems).set(updates).where(eq(mediaItems.id, itemId));
	}
	return { backfilledSeriesId };
}

/** The item's descriptive half, as seeded from an external API. */
type ItemMetadataValues = {
	type: MediaItemType;
	title: string;
	description: string | null;
	coverImageUrl: string | null;
	releaseDate: string | null;
	externalId: string;
	externalSource: string;
	metadata: Record<string, unknown>;
};

async function insertLibraryEntry(
	userId: string,
	values: ItemMetadataValues,
	seriesId: number | null,
	creatorId: number | null,
	status: MediaItemStatus = MediaItemStatus.BACKLOG,
): Promise<number> {
	const [newItem] = await db
		.insert(mediaItems)
		.values({
			userId,
			...values,
			status,
			seriesId,
			creatorId,
		})
		.onConflictDoNothing()
		.returning({ id: mediaItems.id });

	if (newItem) return newItem.id;

	// Lost a race against a concurrent add of the same external item.
	const [existing] = await db
		.select({ id: mediaItems.id })
		.from(mediaItems)
		.where(
			and(
				eq(mediaItems.userId, userId),
				eq(mediaItems.externalId, values.externalId),
				eq(mediaItems.externalSource, values.externalSource),
			),
		);
	if (!existing) throw new Error("Failed to create library entry");
	return existing.id;
}
