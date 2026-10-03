import { sql } from "drizzle-orm";
import {
	type ConsumptionInfo,
	creators,
	customReports,
	type FictionRating,
	type FilterAndSortOptions,
	genres,
	type ItemSortField,
	mediaItemInstances,
	mediaItemRelations,
	mediaItems,
	mediaItemTags,
	type SeasonReview,
	type SeriesSortField,
	type SortDirection,
	series,
	tags,
	user,
	userSettings,
	type ViewSubject,
	viewGroups,
	viewItemOrder,
	views,
} from "#/database/schema";
import type { DashboardReportType } from "#/features/screens/reports/types";
import type {
	BookConsumptionMethod,
	GameControlMethod,
	GamePlatform,
	MediaItemStatus,
	MediaItemType,
	MovieConsumptionMethod,
	NextItemStatus,
	PurchaseStatus,
	TvShowConsumptionMethod,
} from "#/lib/enums";
import { testDb } from "./db";

// ---------------------------------------------------------------------------
// Truncation
// ---------------------------------------------------------------------------

/**
 * Removes all rows from every app table and resets serial IDs.
 * Call this in beforeEach so each test starts with a clean slate.
 *
 * Note: `series`, `creators`, `genres`, `tags`, `media_items`,
 * `media_item_instances`, `media_item_tags`, `media_item_relations`, `views`,
 * and `view_groups` all use plain-text userId (no FK to `user`), so those need
 * no auth rows. `view_item_order` needs none either — it inherits ownership
 * from the view it points at. `custom_reports` and `user_settings` are the
 * exceptions — both reference `user.id`, so seed a row with `insertUser`
 * before touching them.
 */
export async function truncateAll() {
	// `user` is a reserved word and must stay quoted. Truncating it cascades to
	// `session` and `account`, which is what we want between tests.
	await testDb.execute(sql`
		TRUNCATE
			user_settings,
			custom_reports,
			media_item_instances,
			media_item_tags,
			media_item_relations,
			view_item_order,
			media_items,
			series,
			creators,
			genres,
			tags,
			views,
			view_groups,
			"user"
		RESTART IDENTITY CASCADE
	`);
}

// ---------------------------------------------------------------------------
// Row factories
// ---------------------------------------------------------------------------

type InsertMediaItemOptions = {
	userId: string;
	type: MediaItemType;
	title?: string;
	description?: string;
	coverImageUrl?: string;
	releaseDate?: string;
	externalId?: string;
	externalSource?: string;
	metadata?: Record<string, unknown>;
	status?: MediaItemStatus;
	purchaseStatus?: PurchaseStatus;
	expectedReleaseDate?: string;
	seriesId?: number;
	creatorId?: number;
	genreId?: number;
};

/** Inserts a `media_items` row — descriptive data and all — and returns its id. */
export async function insertMediaItem(
	options: InsertMediaItemOptions,
): Promise<number> {
	const [row] = await testDb
		.insert(mediaItems)
		.values({
			userId: options.userId,
			type: options.type,
			title: options.title ?? "Test Title",
			description: options.description ?? null,
			coverImageUrl: options.coverImageUrl ?? null,
			releaseDate: options.releaseDate ?? null,
			// A fresh UUID keeps the common case collision-free under the
			// (userId, externalId, externalSource) unique index; pin it explicitly
			// to seed two users holding the same external item.
			externalId: options.externalId ?? crypto.randomUUID(),
			externalSource: options.externalSource ?? "test",
			metadata: options.metadata ?? {},
			status: options.status ?? ("backlog" as MediaItemStatus),
			purchaseStatus:
				options.purchaseStatus ?? ("not_purchased" as PurchaseStatus),
			expectedReleaseDate: options.expectedReleaseDate ?? null,
			seriesId: options.seriesId ?? null,
			creatorId: options.creatorId ?? null,
			genreId: options.genreId ?? null,
		})
		.returning({ id: mediaItems.id });

	if (!row) throw new Error("insertMediaItem failed");
	return row.id;
}

type InsertInstanceOptions = {
	mediaItemId: number;
	completedAt?: string;
	startedAt?: string;
	rating?: string;
	reviewText?: string;
	fictionRating?: FictionRating;
	seasonReviews?: SeasonReview[];
	consumptionInfo?: ConsumptionInfo;
};

/** Inserts a `media_item_instances` row and returns its id. */
export async function insertInstance(
	options: InsertInstanceOptions,
): Promise<number> {
	const [row] = await testDb
		.insert(mediaItemInstances)
		.values({
			mediaItemId: options.mediaItemId,
			completedAt: options.completedAt ?? null,
			startedAt: options.startedAt ?? null,
			rating: options.rating ?? null,
			reviewText: options.reviewText ?? null,
			fictionRating: options.fictionRating ?? null,
			seasonReviews: options.seasonReviews ?? null,
			consumptionInfo: options.consumptionInfo ?? null,
		})
		.returning({ id: mediaItemInstances.id });

	if (!row) throw new Error("insertInstance failed");
	return row.id;
}

type InsertSeriesOptions = {
	userId: string;
	name?: string;
	type: MediaItemType;
	status?: MediaItemStatus;
	nextItemStatus?: NextItemStatus;
	rating?: string;
	description?: string;
	isComplete?: boolean;
};

/** Inserts a `series` row and returns its id. */
export async function insertSeries(
	options: InsertSeriesOptions,
): Promise<number> {
	const [row] = await testDb
		.insert(series)
		.values({
			userId: options.userId,
			name: options.name ?? "Test Series",
			type: options.type,
			status: options.status ?? ("backlog" as MediaItemStatus),
			nextItemStatus: options.nextItemStatus ?? null,
			rating: options.rating ?? null,
			description: options.description ?? null,
			isComplete: options.isComplete ?? false,
		})
		.returning({ id: series.id });

	if (!row) throw new Error("insertSeries failed");
	return row.id;
}

type InsertGenreOptions = {
	userId: string;
	name: string;
};

/** Inserts a `genres` row and returns its id. */
export async function insertGenre(
	options: InsertGenreOptions,
): Promise<number> {
	const [row] = await testDb
		.insert(genres)
		.values({ userId: options.userId, name: options.name })
		.returning({ id: genres.id });

	if (!row) throw new Error("insertGenre failed");
	return row.id;
}

type InsertTagOptions = {
	userId: string;
	name: string;
};

/** Inserts a `tags` row and returns its id. */
export async function insertTag(options: InsertTagOptions): Promise<number> {
	const [row] = await testDb
		.insert(tags)
		.values({ userId: options.userId, name: options.name })
		.returning({ id: tags.id });

	if (!row) throw new Error("insertTag failed");
	return row.id;
}

/** Links a media item to a tag. */
export async function linkTag(
	mediaItemId: number,
	tagId: number,
): Promise<void> {
	await testDb.insert(mediaItemTags).values({ mediaItemId, tagId });
}

type InsertCreatorOptions = {
	userId: string;
	name: string;
};

/** Inserts a `creators` row and returns its id. */
export async function insertCreator(
	options: InsertCreatorOptions,
): Promise<number> {
	const [row] = await testDb
		.insert(creators)
		.values({ userId: options.userId, name: options.name })
		.returning({ id: creators.id });

	if (!row) throw new Error("insertCreator failed");
	return row.id;
}

/**
 * Inserts a better-auth `user` row. Only `custom_reports` and `user_settings`
 * need one — every other app table stores userId as plain text.
 */
export async function insertUser(userId: string): Promise<void> {
	await testDb.insert(user).values({
		id: userId,
		name: userId,
		email: `${userId}@test.local`,
	});
}

type InsertViewOptions = {
	userId: string;
	name?: string;
	subject?: ViewSubject;
	filters?: FilterAndSortOptions;
	displayOrder?: number;
	groupId?: number;
};

/** Inserts a `views` row and returns its id. */
export async function insertView(options: InsertViewOptions): Promise<number> {
	const [row] = await testDb
		.insert(views)
		.values({
			userId: options.userId,
			name: options.name ?? "Test View",
			subject: options.subject ?? "items",
			filters: options.filters ?? {},
			displayOrder: options.displayOrder ?? 0,
			groupId: options.groupId ?? null,
		})
		.returning({ id: views.id });

	if (!row) throw new Error("insertView failed");
	return row.id;
}

type InsertViewGroupOptions = {
	userId: string;
	name?: string;
	displayOrder?: number;
	isCollapsed?: boolean;
};

/** Inserts a `view_groups` row and returns its id. */
export async function insertViewGroup(
	options: InsertViewGroupOptions,
): Promise<number> {
	const [row] = await testDb
		.insert(viewGroups)
		.values({
			userId: options.userId,
			name: options.name ?? "Test Group",
			displayOrder: options.displayOrder ?? 0,
			isCollapsed: options.isCollapsed ?? false,
		})
		.returning({ id: viewGroups.id });

	if (!row) throw new Error("insertViewGroup failed");
	return row.id;
}

type InsertViewItemOrderOptions = {
	viewId: number;
	mediaItemId: number;
	position: number;
};

/** Places a media item at a position inside a custom-ordered view. */
export async function insertViewItemOrder(
	options: InsertViewItemOrderOptions,
): Promise<void> {
	await testDb.insert(viewItemOrder).values({
		viewId: options.viewId,
		mediaItemId: options.mediaItemId,
		position: options.position,
	});
}

type InsertMediaItemRelationOptions = {
	mediaItemIdA: number;
	mediaItemIdB: number;
};

/** Links two media items as related. Does not normalize column order. */
export async function insertMediaItemRelation(
	options: InsertMediaItemRelationOptions,
): Promise<void> {
	await testDb.insert(mediaItemRelations).values({
		mediaItemIdA: options.mediaItemIdA,
		mediaItemIdB: options.mediaItemIdB,
	});
}

type InsertCustomReportOptions = {
	userId: string;
	name?: string;
	reportType?: DashboardReportType;
	mediaTypes?: MediaItemType[];
	monthCount?: number;
	displayOrder?: number;
};

/** Inserts a `custom_reports` row and returns its id. Needs `insertUser` first. */
export async function insertCustomReport(
	options: InsertCustomReportOptions,
): Promise<number> {
	const [row] = await testDb
		.insert(customReports)
		.values({
			userId: options.userId,
			name: options.name ?? "Test Report",
			reportType: options.reportType ?? "items_completed_by_month",
			mediaTypes: options.mediaTypes ?? null,
			monthCount: options.monthCount ?? 12,
			displayOrder: options.displayOrder ?? 0,
		})
		.returning({ id: customReports.id });

	if (!row) throw new Error("insertCustomReport failed");
	return row.id;
}

type InsertUserSettingsOptions = {
	userId: string;
	activeCustomReportId?: number;
	defaultLibrarySortBy?: ItemSortField;
	defaultLibrarySortDirection?: SortDirection;
	defaultSeriesSortBy?: SeriesSortField;
	defaultSeriesSortDirection?: SortDirection;
	defaultBookConsumptionMethod?: BookConsumptionMethod;
	defaultMovieConsumptionMethod?: MovieConsumptionMethod;
	defaultTvShowConsumptionMethod?: TvShowConsumptionMethod;
	defaultGamePlatform?: GamePlatform;
	defaultGameControlMethod?: GameControlMethod;
};

/**
 * Inserts the caller's one `user_settings` row. Needs `insertUser` first, and
 * `insertCustomReport` first when passing `activeCustomReportId`.
 */
export async function insertUserSettings(
	options: InsertUserSettingsOptions,
): Promise<void> {
	await testDb.insert(userSettings).values({
		userId: options.userId,
		activeCustomReportId: options.activeCustomReportId ?? null,
		defaultLibrarySortBy: options.defaultLibrarySortBy ?? null,
		defaultLibrarySortDirection: options.defaultLibrarySortDirection ?? null,
		defaultSeriesSortBy: options.defaultSeriesSortBy ?? null,
		defaultSeriesSortDirection: options.defaultSeriesSortDirection ?? null,
		defaultBookConsumptionMethod: options.defaultBookConsumptionMethod ?? null,
		defaultMovieConsumptionMethod:
			options.defaultMovieConsumptionMethod ?? null,
		defaultTvShowConsumptionMethod:
			options.defaultTvShowConsumptionMethod ?? null,
		defaultGamePlatform: options.defaultGamePlatform ?? null,
		defaultGameControlMethod: options.defaultGameControlMethod ?? null,
	});
}
