import {
	and,
	asc,
	desc,
	eq,
	gte,
	inArray,
	isNotNull,
	ne,
	sql,
} from "drizzle-orm";

import { db } from "#/database/index";
import { mediaItemInstances, mediaItems, series } from "#/database/schema";
import { MediaItemStatus } from "#/lib/enums";
import { fetchLatestRatingsByMediaItemId } from "#/lib/queries/ratingsQuery.server";
import { findLastIndexWhere } from "#/lib/utils";

export async function fetchInProgressItems(userId: string) {
	return db
		.select({
			id: mediaItems.id,
			status: mediaItems.status,
			purchaseStatus: mediaItems.purchaseStatus,
			title: mediaItems.title,
			type: mediaItems.type,
			coverImageUrl: mediaItems.coverImageUrl,
			seriesId: mediaItems.seriesId,
			seriesName: series.name,
		})
		.from(mediaItems)
		.leftJoin(series, eq(mediaItems.seriesId, series.id))
		.where(
			and(
				eq(mediaItems.userId, userId),
				eq(mediaItems.status, MediaItemStatus.IN_PROGRESS),
			),
		)
		.orderBy(asc(mediaItems.sortTitle));
}

export async function fetchRecentlyFinishedItems(userId: string) {
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
	const cutoffDate = thirtyDaysAgo.toISOString().slice(0, 10);

	const items = await db
		.selectDistinctOn([mediaItems.id], {
			id: mediaItems.id,
			status: mediaItems.status,
			purchaseStatus: mediaItems.purchaseStatus,
			title: mediaItems.title,
			type: mediaItems.type,
			coverImageUrl: mediaItems.coverImageUrl,
			seriesId: mediaItems.seriesId,
			seriesName: series.name,
			completedAt: mediaItemInstances.completedAt,
		})
		.from(mediaItemInstances)
		.innerJoin(mediaItems, eq(mediaItemInstances.mediaItemId, mediaItems.id))
		.leftJoin(series, eq(mediaItems.seriesId, series.id))
		.where(
			and(
				eq(mediaItems.userId, userId),
				isNotNull(mediaItemInstances.completedAt),
				gte(mediaItemInstances.completedAt, cutoffDate),
			),
		)
		.orderBy(mediaItems.id, desc(mediaItemInstances.completedAt));

	// Re-sort by completedAt desc after distinct
	return items.sort((a, b) => {
		if (a.completedAt === null) {
			return 1;
		}
		if (b.completedAt === null) {
			return -1;
		}
		return b.completedAt.localeCompare(a.completedAt);
	});
}

export async function fetchExplicitNextUpItems(userId: string) {
	return db
		.select({
			id: mediaItems.id,
			status: mediaItems.status,
			purchaseStatus: mediaItems.purchaseStatus,
			title: mediaItems.title,
			type: mediaItems.type,
			coverImageUrl: mediaItems.coverImageUrl,
			seriesId: mediaItems.seriesId,
			seriesName: series.name,
		})
		.from(mediaItems)
		.leftJoin(series, eq(mediaItems.seriesId, series.id))
		.where(
			and(
				eq(mediaItems.userId, userId),
				eq(mediaItems.status, MediaItemStatus.NEXT_UP),
			),
		)
		.orderBy(asc(mediaItems.sortTitle));
}

export async function fetchInProgressSeriesIds(
	userId: string,
): Promise<Set<number>> {
	const rows = await db
		.select({ id: series.id })
		.from(series)
		.where(
			and(
				eq(series.userId, userId),
				eq(series.status, MediaItemStatus.IN_PROGRESS),
			),
		);
	return new Set(rows.map((row) => row.id));
}

export async function fetchNextInSeriesItems(
	userId: string,
	inProgressItems: Awaited<ReturnType<typeof fetchInProgressItems>>,
	recentlyFinishedItems: Awaited<ReturnType<typeof fetchRecentlyFinishedItems>>,
	seriesLevelInProgressIds: Set<number>,
) {
	const inProgressSeriesIds = inProgressItems
		.map((item) => item.seriesId)
		.filter((id): id is number => id !== null);

	const recentlyFinishedSeriesIds = recentlyFinishedItems
		.map((item) => item.seriesId)
		.filter((id): id is number => id !== null);

	const uniqueSeriesIds = [
		...new Set([
			...inProgressSeriesIds,
			...recentlyFinishedSeriesIds,
			...seriesLevelInProgressIds,
		]),
	];

	if (uniqueSeriesIds.length === 0) {
		return [];
	}

	const allSeriesItems = await db
		.select({
			id: mediaItems.id,
			status: mediaItems.status,
			purchaseStatus: mediaItems.purchaseStatus,
			title: mediaItems.title,
			type: mediaItems.type,
			coverImageUrl: mediaItems.coverImageUrl,
			seriesId: mediaItems.seriesId,
			seriesName: series.name,
		})
		.from(mediaItems)
		.innerJoin(series, eq(mediaItems.seriesId, series.id))
		.where(
			and(
				eq(mediaItems.userId, userId),
				inArray(mediaItems.seriesId, uniqueSeriesIds),
				ne(series.status, MediaItemStatus.DROPPED),
			),
		)
		.orderBy(
			mediaItems.seriesId,
			sql`NULLIF(media_items.metadata->>'seriesBookNumber', '')::numeric NULLS LAST`,
			mediaItems.releaseDate,
		);

	// Group all series items by seriesId, preserving DB order
	const allItemsBySeriesId = new Map<number, typeof allSeriesItems>();
	for (const item of allSeriesItems) {
		if (item.seriesId === null) {
			continue;
		}
		if (!allItemsBySeriesId.has(item.seriesId)) {
			allItemsBySeriesId.set(item.seriesId, []);
		}
		const existing = allItemsBySeriesId.get(item.seriesId);
		if (existing) {
			existing.push(item);
		}
	}

	// Build the set of active item IDs (in progress or recently finished)
	const activeItemIds = new Set([
		...inProgressItems.map((item) => item.id),
		...recentlyFinishedItems.map((item) => item.id),
	]);

	// For each series, find the last active item by index, then the first backlog item after it
	const nextInSeriesItems: typeof allSeriesItems = [];
	for (const [seriesId, items] of allItemsBySeriesId.entries()) {
		let lastActiveIndex = findLastIndexWhere(items, (item) =>
			activeItemIds.has(item.id),
		);

		if (lastActiveIndex === -1 && seriesLevelInProgressIds.has(seriesId)) {
			// No recently-active individual items — use the last non-backlog item
			// as the progress point so the next unread item is surfaced correctly.
			lastActiveIndex = findLastIndexWhere(
				items,
				(item) => item.status !== MediaItemStatus.BACKLOG,
			);
		} else if (lastActiveIndex === -1) {
			continue;
		}

		const nextItem = items.slice(lastActiveIndex + 1).find((item) => {
			return item.status === MediaItemStatus.BACKLOG;
		});
		if (nextItem) {
			nextInSeriesItems.push(nextItem);
		}
	}

	return nextInSeriesItems;
}

async function attachRatings<T extends { id: number }>(
	items: T[],
): Promise<(T & { rating: number })[]> {
	if (items.length === 0) {
		return items.map((item) => ({ ...item, rating: 0 }));
	}

	const itemIds = items.map((item) => item.id);
	const latestRatings = await fetchLatestRatingsByMediaItemId(itemIds);

	return items.map((item) => ({
		...item,
		rating: latestRatings.get(item.id)?.rating ?? 0,
	}));
}

export async function fetchDashboardData(userId: string) {
	const [
		inProgressItemsRaw,
		recentlyFinishedItemsRaw,
		seriesLevelInProgressIds,
	] = await Promise.all([
		fetchInProgressItems(userId),
		fetchRecentlyFinishedItems(userId),
		fetchInProgressSeriesIds(userId),
	]);

	const [explicitNextUpItemsRaw, autoNextInSeriesItemsRaw] = await Promise.all([
		fetchExplicitNextUpItems(userId),
		fetchNextInSeriesItems(
			userId,
			inProgressItemsRaw,
			recentlyFinishedItemsRaw,
			seriesLevelInProgressIds,
		),
	]);

	const explicitNextUpIds = new Set(
		explicitNextUpItemsRaw.map((item) => item.id),
	);
	const dedupedAutoItems = autoNextInSeriesItemsRaw.filter(
		(item) => !explicitNextUpIds.has(item.id),
	);
	const nextInSeriesItemsRaw = [...explicitNextUpItemsRaw, ...dedupedAutoItems];

	const recentlyFinishedWithoutCompletedAt = recentlyFinishedItemsRaw.map(
		({ completedAt: _completedAt, ...rest }) => rest,
	);

	const [inProgressItems, nextInSeriesItems, recentlyFinishedItems] =
		await Promise.all([
			attachRatings(inProgressItemsRaw),
			attachRatings(nextInSeriesItemsRaw),
			attachRatings(recentlyFinishedWithoutCompletedAt),
		]);

	return { inProgressItems, nextInSeriesItems, recentlyFinishedItems };
}
