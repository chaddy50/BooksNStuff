import { sql } from "drizzle-orm";
import {
	boolean,
	date,
	decimal,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	serial,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import {
	type BookConsumptionMethod,
	type GameControlMethod,
	type GamePlatform,
	MediaItemStatus,
	MediaItemType,
	type MovieConsumptionMethod,
	NextItemStatus,
	PurchaseStatus,
	type TvShowConsumptionMethod,
} from "#/lib/enums";

// --- Enums ---

export const mediaTypeEnum = pgEnum("media_type", [
	MediaItemType.BOOK,
	MediaItemType.MOVIE,
	MediaItemType.TV_SHOW,
	MediaItemType.VIDEO_GAME,
	MediaItemType.PODCAST,
]);

export const mediaItemStatusEnum = pgEnum("media_item_status", [
	MediaItemStatus.BACKLOG,
	MediaItemStatus.NEXT_UP,
	MediaItemStatus.IN_PROGRESS,
	MediaItemStatus.ON_HOLD,
	MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
	MediaItemStatus.COMPLETED,
	MediaItemStatus.DROPPED,
]);

export const nextItemStatusEnum = pgEnum("next_item_status", [
	NextItemStatus.WAITING_FOR_RELEASE,
	NextItemStatus.PURCHASED,
	NextItemStatus.AVAILABLE,
]);

export const purchaseStatusEnum = pgEnum("purchase_status", [
	PurchaseStatus.NOT_PURCHASED,
	PurchaseStatus.WANT_TO_BUY,
	PurchaseStatus.PURCHASED,
]);

// --- Metadata types (typed at the TS level; JSONB is schemaless in Postgres) ---

type BookMetadata = {
	author?: string;
	isbn?: string;
	pageCount?: number;
	genres?: string[];
	series?: string;
	seriesBookNumber?: string;
};

type MovieMetadata = {
	director?: string;
	runtime?: number; // minutes
	genres?: string[];
	series?: string;
};

type TvMetadata = {
	creator?: string;
	seasons?: number;
	genres?: string[];
	episodeRuntime?: number; // minutes per episode
	numberOfEpisodes?: number;
};

type GameMetadata = {
	developer?: string;
	platforms?: string[];
	genres?: string[];
	series?: string;
	timeToBeatFetchedAt?: string; // ISO timestamp — presence means fetch was attempted
	timeToBeatHastily?: number; // hours (rounded)
	timeToBeatNormally?: number; // hours (rounded)
	timeToBeatCompletely?: number; // hours (rounded)
};

type PodcastMetadata = {
	creator?: string;
	genres?: string[];
	feedUrl?: string; // parent podcast RSS feed URL
	episodeNumbers?: number[]; // e.g. [1] or [47, 48, 49, 50, 51, 52]
	episodeTitles?: string[];
	episodeGuids?: string[]; // RSS GUIDs, used for pre-selecting episodes in edit mode
	totalDuration?: number; // minutes
	firstPublishedAt?: string;
	lastPublishedAt?: string;
};

type MediaMetadata =
	| BookMetadata
	| MovieMetadata
	| TvMetadata
	| GameMetadata
	| PodcastMetadata;

export type ViewSubject = "items" | "series";

export type ItemSortField =
	| "updatedAt"
	| "title"
	| "rating"
	| "completedAt"
	| "creator"
	| "series"
	| "status"
	| "director"
	| "releaseDate"
	| "custom";
export type SeriesSortField =
	| "name"
	| "updatedAt"
	| "rating"
	| "itemCount"
	| "status"
	| "nextItemStatus";
export type SortDirection = "asc" | "desc";

export type FilterAndSortOptions = {
	mediaTypes?: MediaItemType[];
	statuses?: MediaItemStatus[];
	purchaseStatuses?: PurchaseStatus[];
	completedThisYear?: boolean;
	completedDateStart?: string;
	completedDateEnd?: string;
	isSeriesComplete?: boolean;
	tags?: string[];
	genres?: string[];
	sortBy?: ItemSortField | SeriesSortField;
	sortDirection?: SortDirection;
	titleQuery?: string;
	creatorQuery?: string;
};

export type FictionRatingField = { rating: number; comment?: string };

export type FictionRating = {
	setting: FictionRatingField;
	character: FictionRatingField;
	plot: FictionRatingField;
	enjoyment: FictionRatingField;
	depth: FictionRatingField;
};

export type SeasonReview = {
	season: number;
	startedAt: string;
	completedAt: string;
	rating: number;
	reviewText: string;
	fictionRating?: FictionRating;
};

export type ConsumptionInfo = {
	method: string;
	controlMethod?: GameControlMethod;
};

// --- Better-auth tables ---

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdateFn(() => new Date())
		.notNull(),
});

export const session = pgTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamp("expires_at").notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdateFn(() => new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at"),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.$onUpdateFn(() => new Date())
			.notNull(),
	},
	(table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
	"verification",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdateFn(() => new Date())
			.notNull(),
	},
	(table) => [index("verification_identifier_idx").on(table.identifier)],
);

// --- App tables ---

/**
 * A named series (e.g. "The Lord of the Rings", "Star Wars").
 * Holds the user's overall status and rating for the whole series.
 */
export const series = pgTable("series", {
	id: serial("id").primaryKey(),
	userId: text("user_id").notNull(),
	name: text("name").notNull(),
	type: mediaTypeEnum("type").notNull(),
	status: mediaItemStatusEnum("status").notNull().default("backlog"),
	statusSortOrder: integer("status_sort_order").generatedAlwaysAs(
		sql`CASE status
			WHEN 'backlog' THEN 0
			WHEN 'waiting_for_next_release' THEN 1
			WHEN 'on_hold' THEN 2
			WHEN 'next_up' THEN 3
			WHEN 'in_progress' THEN 4
			WHEN 'done' THEN 5
			WHEN 'dropped' THEN 6
			ELSE 99
		END`,
	),
	rating: decimal("rating", { precision: 3, scale: 1 }),
	description: text("description"),
	isComplete: boolean("is_complete").notNull().default(false),
	nextItemStatus: nextItemStatusEnum("next_item_status"),
	nextItemStatusSortOrder: integer(
		"next_item_status_sort_order",
	).generatedAlwaysAs(
		sql`CASE next_item_status
			WHEN 'purchased' THEN 0
			WHEN 'available' THEN 1
			WHEN 'waiting_for_release' THEN 2
			ELSE 99
		END`,
	),
	sortName: text("sort_name").generatedAlwaysAs(
		sql`CASE
			WHEN LOWER(name) LIKE 'the %' THEN SUBSTRING(name FROM 5)
			WHEN LOWER(name) LIKE 'an %' THEN SUBSTRING(name FROM 4)
			WHEN LOWER(name) LIKE 'a %' THEN SUBSTRING(name FROM 3)
			ELSE name
		END`,
	),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.notNull()
		.$onUpdateFn(() => new Date()),
});

/**
 * A named creator (e.g. "Brandon Sanderson", "Christopher Nolan").
 * Covers book authors, movie directors, TV show creators, podcast hosts,
 * and game studio developers. One row per user per unique name.
 */
export const creators = pgTable(
	"creators",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id").notNull(),
		name: text("name").notNull(),
		biography: text("biography"),
		sortName: text("sort_name").generatedAlwaysAs(
			sql`REGEXP_REPLACE(name, '^.* ', '')`,
		),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdateFn(() => new Date()),
	},
	(table) => [
		uniqueIndex("creators_userId_name_unique").on(table.userId, table.name),
	],
);

/**
 * User-defined genres for categorizing media items.
 * Each genre is unique per user (name is case-sensitive).
 */
export const genres = pgTable(
	"genres",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id").notNull(),
		name: text("name").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("genres_userId_name_unique").on(table.userId, table.name),
	],
);

export type Genre = typeof genres.$inferSelect;

/**
 * One row per media item the user is tracking — one user's own copy of one item.
 *
 * Holds both halves of an item: the descriptive data seeded from an external API
 * (TMDB, IGDB, Hardcover, iTunes) and freely editable thereafter, and the user's
 * tracking state. The two used to live in a separate shared `media_metadata`
 * table; because the descriptive half is user-editable, sharing it let one user's
 * edit overwrite another's, so it lives here where it is private by construction.
 *
 * Represents the "shelf" — what status is this item at right now?
 * Re-reads/re-watches keep status as "in_progress"; the UI derives the
 * "re-doing" label by checking for prior completed instances.
 */
export const mediaItems = pgTable(
	"media_items",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id").notNull(),
		type: mediaTypeEnum("type").notNull(),
		title: text("title").notNull(),
		description: text("description"),
		coverImageUrl: text("cover_image_url"),
		releaseDate: date("release_date"),
		externalId: text("external_id").notNull(),
		externalSource: text("external_source").notNull(), // e.g. "tmdb", "igdb", "hardcover", "itunes", "custom"
		metadata: jsonb("metadata").$type<MediaMetadata>(),
		sortTitle: text("sort_title").generatedAlwaysAs(
			sql`CASE
				WHEN LOWER(title) LIKE 'the %' THEN SUBSTRING(title FROM 5)
				WHEN LOWER(title) LIKE 'an %' THEN SUBSTRING(title FROM 4)
				WHEN LOWER(title) LIKE 'a %' THEN SUBSTRING(title FROM 3)
				ELSE title
			END`,
		),
		seriesSortName: text("series_sort_name").generatedAlwaysAs(
			sql`CASE
				WHEN LOWER(metadata->>'series') LIKE 'the %' THEN SUBSTRING(metadata->>'series' FROM 5)
				WHEN LOWER(metadata->>'series') LIKE 'an %' THEN SUBSTRING(metadata->>'series' FROM 4)
				WHEN LOWER(metadata->>'series') LIKE 'a %' THEN SUBSTRING(metadata->>'series' FROM 3)
				ELSE metadata->>'series'
			END`,
		),
		seriesId: integer("series_id").references(() => series.id, {
			onDelete: "set null",
		}),
		creatorId: integer("creator_id").references(() => creators.id, {
			onDelete: "set null",
		}),
		genreId: integer("genre_id").references(() => genres.id, {
			onDelete: "set null",
		}),
		status: mediaItemStatusEnum("status").notNull().default("backlog"),
		statusSortOrder: integer("status_sort_order").generatedAlwaysAs(
			sql`CASE status
				WHEN 'backlog' THEN 0
				WHEN 'waiting_for_next_release' THEN 1
				WHEN 'on_hold' THEN 2
				WHEN 'next_up' THEN 3
				WHEN 'in_progress' THEN 4
				WHEN 'done' THEN 5
				WHEN 'dropped' THEN 6
				ELSE 99
			END`,
		),
		purchaseStatus: purchaseStatusEnum("purchase_status")
			.notNull()
			.default("not_purchased"),
		expectedReleaseDate: date("expected_release_date"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdateFn(() => new Date()),
	},
	(table) => [
		// Primary query pattern: filter by user, sort by most recently updated
		index("media_items_userId_updatedAt_idx").on(table.userId, table.updatedAt),
		// Filter by user + status (used by library filters and view queries)
		index("media_items_userId_status_idx").on(table.userId, table.status),
		// One row per user per external item — the idempotency guarantee for adds,
		// replacing the old global uniqueness on (external_id, external_source).
		uniqueIndex("media_items_user_external_unique").on(
			table.userId,
			table.externalId,
			table.externalSource,
		),
	],
);

/**
 * One row per individual read/watch/playthrough of a media item.
 * A user can have multiple instances for the same entry (re-reads, re-watches, etc.).
 * Rating and review live here, scoped to a specific instance.
 * Instance order (1st, 2nd, etc.) is derived from `id` / `createdAt` when querying.
 */
export const mediaItemInstances = pgTable(
	"media_item_instances",
	{
		id: serial("id").primaryKey(),
		mediaItemId: integer("media_item_id")
			.notNull()
			.references(() => mediaItems.id, { onDelete: "cascade" }),
		rating: decimal("rating", { precision: 3, scale: 1 }),
		fictionRating: jsonb("fiction_rating").$type<FictionRating>(),
		seasonReviews: jsonb("season_reviews").$type<SeasonReview[]>(),
		consumptionInfo: jsonb("consumption_info").$type<ConsumptionInfo>(),
		reviewText: text("review_text"),
		startedAt: date("started_at"),
		completedAt: date("completed_at"), // null = still in progress
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.notNull()
			.$onUpdateFn(() => new Date()),
	},
	(table) => [
		// Used by the DISTINCT ON ratings lookup and per-item instance queries
		index("media_item_instances_mediaItemId_idx").on(table.mediaItemId),
	],
);

/**
 * User-defined tags for organizing media items.
 * Each tag is unique per user (name is case-sensitive).
 */
export const tags = pgTable(
	"tags",
	{
		id: serial("id").primaryKey(),
		userId: text("user_id").notNull(),
		name: text("name").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("tags_userId_name_unique").on(table.userId, table.name),
	],
);

export type Tag = typeof tags.$inferSelect;

/**
 * Junction table linking media items to tags.
 * Deletes cascade when either the media item or the tag is removed.
 */
export const mediaItemTags = pgTable(
	"media_item_tags",
	{
		mediaItemId: integer("media_item_id")
			.notNull()
			.references(() => mediaItems.id, { onDelete: "cascade" }),
		tagId: integer("tag_id")
			.notNull()
			.references(() => tags.id, { onDelete: "cascade" }),
	},
	(table) => [primaryKey({ columns: [table.mediaItemId, table.tagId] })],
);

/**
 * Symmetric "related item" links between two media items (e.g. a book and its
 * movie adaptation). One row covers both directions — `mediaItemIdA` is always
 * the smaller id, enforced in the server layer (not the database) before every
 * insert/delete, so the pair can only ever be stored once regardless of which
 * item the user started from.
 */
export const mediaItemRelations = pgTable(
	"media_item_relations",
	{
		mediaItemIdA: integer("media_item_id_a")
			.notNull()
			.references(() => mediaItems.id, { onDelete: "cascade" }),
		mediaItemIdB: integer("media_item_id_b")
			.notNull()
			.references(() => mediaItems.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.mediaItemIdA, table.mediaItemIdB] }),
		// The primary key covers lookups where the viewed item is the lower id;
		// this covers the other direction.
		index("media_item_relations_mediaItemIdB_idx").on(table.mediaItemIdB),
	],
);

/**
 * User-created custom dashboard reports.
 */
export const customReports = pgTable("custom_reports", {
	id: serial("id").primaryKey(),
	userId: text("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	reportType: text("report_type").notNull(),
	mediaTypes: text("media_types").array(),
	monthCount: integer("month_count").notNull().default(12),
	displayOrder: integer("display_order").notNull().default(0),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.notNull()
		.$onUpdateFn(() => new Date()),
});

/**
 * One row per user — stores user-level application preferences.
 */
export const userSettings = pgTable("user_settings", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	activeCustomReportId: integer("active_custom_report_id").references(
		() => customReports.id,
		{ onDelete: "set null" },
	),
	defaultLibrarySortBy: text("default_library_sort_by").$type<ItemSortField>(),
	defaultLibrarySortDirection: text(
		"default_library_sort_direction",
	).$type<SortDirection>(),
	defaultSeriesSortBy: text("default_series_sort_by").$type<SeriesSortField>(),
	defaultSeriesSortDirection: text(
		"default_series_sort_direction",
	).$type<SortDirection>(),
	defaultBookConsumptionMethod: text(
		"default_book_consumption_method",
	).$type<BookConsumptionMethod>(),
	defaultMovieConsumptionMethod: text(
		"default_movie_consumption_method",
	).$type<MovieConsumptionMethod>(),
	defaultTvShowConsumptionMethod: text(
		"default_tv_show_consumption_method",
	).$type<TvShowConsumptionMethod>(),
	defaultGamePlatform: text("default_game_platform").$type<GamePlatform>(),
	defaultGameControlMethod: text(
		"default_game_control_method",
	).$type<GameControlMethod>(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.notNull()
		.$onUpdateFn(() => new Date()),
});

export type UserSettings = typeof userSettings.$inferSelect;

/**
 * User-defined folders that hold views in the sidebar. A view with no group sits
 * at the top level alongside the groups themselves, which is why `displayOrder`
 * here shares one ordering space with an ungrouped view's `displayOrder`.
 */
export const viewGroups = pgTable("view_groups", {
	id: serial("id").primaryKey(),
	userId: text("user_id").notNull(),
	name: text("name").notNull(),
	displayOrder: integer("display_order").notNull().default(0),
	isCollapsed: boolean("is_collapsed").notNull().default(false),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.notNull()
		.$onUpdateFn(() => new Date()),
});

/**
 * User-defined views — named, saved filter configurations that can show
 * either media items or series.
 */
export const views = pgTable("views", {
	id: serial("id").primaryKey(),
	userId: text("user_id").notNull(),
	name: text("name").notNull(),
	subject: text("subject").notNull().$type<ViewSubject>(), // 'items' | 'series'
	filters: jsonb("filters").notNull().default({}).$type<FilterAndSortOptions>(),
	displayOrder: integer("display_order").notNull().default(0),
	// Deleting a group returns its views to the top level rather than destroying
	// them, so this is `set null` and never `cascade`.
	groupId: integer("group_id").references(() => viewGroups.id, {
		onDelete: "set null",
	}),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.notNull()
		.$onUpdateFn(() => new Date()),
});

/**
 * One row per media item that has been hand-placed inside a custom-ordered view.
 */
export const viewItemOrder = pgTable(
	"view_item_order",
	{
		viewId: integer("view_id")
			.notNull()
			.references(() => views.id, { onDelete: "cascade" }),
		mediaItemId: integer("media_item_id")
			.notNull()
			.references(() => mediaItems.id, { onDelete: "cascade" }),
		position: integer("position").notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.viewId, table.mediaItemId] }),
		index("view_item_order_viewId_position_idx").on(
			table.viewId,
			table.position,
		),
	],
);
