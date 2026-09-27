import {
	and,
	asc,
	desc,
	eq,
	exists,
	ilike,
	inArray,
	isNotNull,
	or,
	sql,
} from "drizzle-orm";

import { db } from "#/database/index";
import {
	type FilterAndSortOptions,
	mediaItemInstances,
	mediaItems,
	type SeriesSortField,
	series,
} from "#/database/schema";
import {
	MediaItemStatus,
	type MediaItemType,
	NextItemStatus,
} from "#/lib/enums";
import { inferSeriesStatus } from "#/lib/queries/seriesStatus";
import { MAX_QUERY_LIMIT } from "#/lib/queries/types";

// ---------------------------------------------------------------------------
// runSeriesQuery
// ---------------------------------------------------------------------------

export type SeriesQueryItem = {
	id: number;
	name: string;
	type: MediaItemType;
	status: MediaItemStatus;
	rating: number;
	isComplete: boolean;
	nextItemStatus: NextItemStatus | null;
	itemCount: number;
};

const PAGE_SIZE = 48;

export async function runSeriesQuery(
	filters: FilterAndSortOptions,
	userId: string,
	offset: number = 0,
	limit: number = PAGE_SIZE,
): Promise<{ items: SeriesQueryItem[]; hasMore: boolean }> {
	const pageLimit = Math.min(limit, MAX_QUERY_LIMIT);
	const conditions = [
		eq(series.userId, userId),
		filters.mediaTypes?.length
			? inArray(series.type, filters.mediaTypes)
			: undefined,
		filters.statuses?.length
			? inArray(series.status, filters.statuses)
			: undefined,
		filters.isSeriesComplete !== undefined
			? eq(series.isComplete, filters.isSeriesComplete)
			: undefined,
		filters.titleQuery
			? or(
					ilike(series.name, `%${filters.titleQuery}%`),
					exists(
						db
							.select({ one: sql`1` })
							.from(mediaItems)
							.where(
								and(
									eq(mediaItems.seriesId, series.id),
									eq(mediaItems.userId, userId),
									or(
										ilike(mediaItems.title, `%${filters.titleQuery}%`),
										sql`${mediaItems.metadata}->>'author' ILIKE ${`%${filters.titleQuery}%`}`,
										sql`${mediaItems.metadata}->>'director' ILIKE ${`%${filters.titleQuery}%`}`,
										sql`${mediaItems.metadata}->>'creator' ILIKE ${`%${filters.titleQuery}%`}`,
										sql`${mediaItems.metadata}->>'developer' ILIKE ${`%${filters.titleQuery}%`}`,
									),
								),
							),
					),
				)
			: undefined,
	].filter((c) => c !== undefined);

	const sortBy = (filters.sortBy as SeriesSortField | undefined) ?? "name";
	const sortDirection = filters.sortDirection ?? "asc";
	const dir = sortDirection === "asc" ? asc : desc;

	// Correlated subquery for item count — avoids a separate aggregation query
	// and enables SQL-level sorting by itemCount.
	// NOTE: ${series.id} cannot be used directly here — Drizzle strips the table
	// qualifier in query-builder context, so it becomes bare "id" which PostgreSQL
	// resolves to media_items.id inside the subquery instead of series.id.
	// sql.raw forces the fully-qualified reference needed for correct correlation.
	const itemCountSql = sql<number>`(
		SELECT COUNT(*)::int
		FROM ${mediaItems}
		WHERE ${mediaItems.seriesId} = ${sql.raw('"series"."id"')}
			AND ${mediaItems.userId} = ${userId}
	)`;

	const dbOrderClauses =
		sortBy === "updatedAt"
			? [dir(series.updatedAt)]
			: sortBy === "status"
				? [dir(series.statusSortOrder), asc(series.sortName)]
				: sortBy === "nextItemStatus"
					? [
							sql`${series.nextItemStatusSortOrder} ${sql.raw(sortDirection === "asc" ? "ASC" : "DESC")} NULLS LAST`,
							asc(series.sortName),
						]
					: sortBy === "rating"
						? [
								sql`${series.rating} ${sql.raw(sortDirection === "asc" ? "ASC" : "DESC")} NULLS LAST`,
								asc(series.sortName),
							]
						: sortBy === "itemCount"
							? [
									sql`${itemCountSql} ${sql.raw(sortDirection === "asc" ? "ASC" : "DESC")} NULLS LAST`,
									asc(series.sortName),
								]
							: [dir(series.sortName)];

	const rawRows = await db
		.select({
			id: series.id,
			name: series.name,
			type: series.type,
			status: series.status,
			rating: series.rating,
			isComplete: series.isComplete,
			nextItemStatus: series.nextItemStatus,
			itemCount: itemCountSql,
		})
		.from(series)
		.where(and(...conditions))
		.orderBy(...dbOrderClauses)
		.limit(pageLimit + 1)
		.offset(offset);

	const hasMore = rawRows.length > pageLimit;
	const pageRows = rawRows.slice(0, pageLimit);

	const items = pageRows.map((s) => ({
		...s,
		rating: parseFloat(s.rating ?? "") || 0,
	}));

	return { items, hasMore };
}

// ---------------------------------------------------------------------------
// findNextSeriesItem / getNextItemInSeries
// ---------------------------------------------------------------------------

/**
 * Pure function: given an already-sorted list of series items, return the next
 * item the user should pick up. "Next" means the first BACKLOG item after the
 * last item the user has engaged with (any status other than BACKLOG).
 *
 * If no item has been engaged with yet (all are BACKLOG), returns the first
 * item in the list — the logical starting point for a new series.
 *
 * Returns null when the list is empty or no BACKLOG items remain after the
 * last engaged item.
 */
export function findNextSeriesItem(
	items: Array<{ id: number; status: MediaItemStatus; purchaseStatus: string }>,
): { id: number; purchaseStatus: string } | null {
	if (items.length === 0) {
		return null;
	}

	let lastEngagedIndex = -1;
	for (let index = 0; index < items.length; index++) {
		if (items[index].status !== MediaItemStatus.BACKLOG) {
			lastEngagedIndex = index;
		}
	}

	if (lastEngagedIndex === -1) {
		// No item has been engaged with — return the first item as the starting point.
		return items[0] ?? null;
	}

	const nextItem = items
		.slice(lastEngagedIndex + 1)
		.find((item) => item.status === MediaItemStatus.BACKLOG);

	return nextItem ?? null;
}

export async function getNextItemInSeries(
	seriesId: number,
	userId: string,
): Promise<{ id: number; purchaseStatus: string } | null> {
	const items = await db
		.select({
			id: mediaItems.id,
			status: mediaItems.status,
			purchaseStatus: mediaItems.purchaseStatus,
		})
		.from(mediaItems)
		.where(
			and(eq(mediaItems.seriesId, seriesId), eq(mediaItems.userId, userId)),
		)
		.orderBy(
			sql`(NULLIF(${mediaItems.metadata}->>'seriesBookNumber', ''))::float ASC NULLS LAST`,
			asc(mediaItems.releaseDate),
			asc(mediaItems.sortTitle),
		);

	return findNextSeriesItem(items);
}

// ---------------------------------------------------------------------------
// syncSeriesStatus
// ---------------------------------------------------------------------------

export async function syncSeriesStatus(seriesId: number, userId: string) {
	const items = await db
		.select({ status: mediaItems.status })
		.from(mediaItems)
		.where(
			and(eq(mediaItems.seriesId, seriesId), eq(mediaItems.userId, userId)),
		);

	if (items.length === 0) return;

	const statuses = items.map((i) => i.status);
	const newStatus = inferSeriesStatus(statuses);

	if (newStatus === null) return;

	let newRating: string | null = null;
	if (newStatus === MediaItemStatus.COMPLETED) {
		const latestRatings = await db
			.selectDistinctOn([mediaItemInstances.mediaItemId], {
				rating: mediaItemInstances.rating,
			})
			.from(mediaItemInstances)
			.innerJoin(mediaItems, eq(mediaItemInstances.mediaItemId, mediaItems.id))
			.where(
				and(
					eq(mediaItems.seriesId, seriesId),
					eq(mediaItems.userId, userId),
					isNotNull(mediaItemInstances.completedAt),
				),
			)
			.orderBy(mediaItemInstances.mediaItemId, desc(mediaItemInstances.id));

		// A cleared rating is stored as 0 (not NULL) by the instance editor, so it
		// must be excluded here too or it drags the average toward zero.
		const ratings = latestRatings
			.map((r) => parseFloat(r.rating ?? ""))
			.filter((r) => !Number.isNaN(r) && r > 0);
		if (ratings.length > 0) {
			const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
			newRating = average.toFixed(1);
		}
	}

	const seriesUpdates: Partial<typeof series.$inferInsert> = {
		status: newStatus,
		rating: newStatus === MediaItemStatus.COMPLETED ? newRating : null,
	};
	if (newStatus === MediaItemStatus.COMPLETED) {
		seriesUpdates.nextItemStatus = null;
	} else if (newStatus === MediaItemStatus.WAITING_FOR_NEXT_RELEASE) {
		seriesUpdates.nextItemStatus = NextItemStatus.WAITING_FOR_RELEASE;
	}

	await db
		.update(series)
		.set(seriesUpdates)
		.where(and(eq(series.id, seriesId), eq(series.userId, userId)));
}
