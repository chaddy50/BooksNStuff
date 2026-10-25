import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/database/index";
import {
	creators,
	genres,
	mediaItemInstances,
	mediaItems,
	mediaItemTags,
	series,
	tags,
	userSettings,
	type ViewSubject,
	viewItemOrder,
	views,
} from "#/database/schema";

/**
 * Backup export/import.
 */

export const BACKUP_VERSION = 5;

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export async function exportBackup(userId: string) {
	const seriesRows = await db
		.select()
		.from(series)
		.where(eq(series.userId, userId));

	const itemRows = await db
		.select()
		.from(mediaItems)
		.where(eq(mediaItems.userId, userId));

	const itemIds = itemRows.map((item) => item.id);
	const instanceRows =
		itemIds.length > 0
			? await db
					.select()
					.from(mediaItemInstances)
					.where(inArray(mediaItemInstances.mediaItemId, itemIds))
			: [];

	const mediaItemTagRows =
		itemIds.length > 0
			? await db
					.select()
					.from(mediaItemTags)
					.where(inArray(mediaItemTags.mediaItemId, itemIds))
			: [];

	const viewRows = await db
		.select()
		.from(views)
		.where(eq(views.userId, userId));

	// Order rows carry no userId of their own — reaching them through the user's
	// own view ids is what keeps another user's rows out of the file.
	const viewIds = viewRows.map((view) => view.id);
	const viewItemOrderRows =
		viewIds.length > 0
			? await db
					.select()
					.from(viewItemOrder)
					.where(inArray(viewItemOrder.viewId, viewIds))
			: [];

	const tagRows = await db.select().from(tags).where(eq(tags.userId, userId));

	const creatorRows = await db
		.select()
		.from(creators)
		.where(eq(creators.userId, userId));

	const genreRows = await db
		.select()
		.from(genres)
		.where(eq(genres.userId, userId));

	const settingsRows = await db
		.select()
		.from(userSettings)
		.where(eq(userSettings.userId, userId));

	return {
		version: BACKUP_VERSION,
		exportedAt: new Date().toISOString(),
		series: seriesRows,
		mediaItems: itemRows,
		mediaItemInstances: instanceRows,
		views: viewRows,
		viewItemOrder: viewItemOrderRows,
		tags: tagRows,
		mediaItemTags: mediaItemTagRows,
		creators: creatorRows,
		genres: genreRows,
		userSettings: settingsRows[0] ?? null,
	};
}

// ---------------------------------------------------------------------------
// Zod schemas for import validation
// ---------------------------------------------------------------------------

const seriesBackupSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	type: z.string(),
	status: z.string(),
	rating: z.string().nullable(),
	description: z.string().nullable(),
	isComplete: z.boolean(),
	nextItemStatus: z.string().nullable().optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

const instanceBackupSchema = z.object({
	id: z.number().int(),
	mediaItemId: z.number().int(),
	rating: z.string().nullable(),
	fictionRating: z.unknown().nullable(),
	seasonReviews: z.unknown().nullable().optional(),
	consumptionInfo: z.unknown().nullable().optional(),
	reviewText: z.string().nullable(),
	startedAt: z.string().nullable(),
	completedAt: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

const viewBackupSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	subject: z.string(),
	filters: z.unknown(),
	displayOrder: z.number().int(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

const viewItemOrderBackupSchema = z.object({
	viewId: z.number().int(),
	mediaItemId: z.number().int(),
	position: z.number().int(),
});

const tagBackupSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	createdAt: z.string(),
});

const mediaItemTagBackupSchema = z.object({
	mediaItemId: z.number().int(),
	tagId: z.number().int(),
});

const creatorBackupSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	biography: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

const genreBackupSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	createdAt: z.string(),
});

const customReportBackupSchema = z.object({
	id: z.number().int(),
	name: z.string(),
	reportType: z.string(),
	mediaTypes: z.array(z.string()).nullable(),
	monthCount: z.number().int(),
	displayOrder: z.number().int(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

/** Shared user-settings fields, common to every backup version. */
const userSettingsScalarFieldsSchema = z.object({
	defaultLibrarySortBy: z.string().nullable(),
	defaultLibrarySortDirection: z.string().nullable(),
	defaultSeriesSortBy: z.string().nullable(),
	defaultSeriesSortDirection: z.string().nullable(),
	defaultBookConsumptionMethod: z.string().nullable(),
	defaultMovieConsumptionMethod: z.string().nullable(),
	defaultTvShowConsumptionMethod: z.string().nullable(),
	defaultGamePlatform: z.string().nullable(),
	defaultGameControlMethod: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

/** v1–v4 shape, still carrying the now-removed custom-reports link column. */
const userSettingsBackupSchemaLegacy = userSettingsScalarFieldsSchema.extend({
	activeCustomReportId: z.number().int().nullable(),
});

const userSettingsBackupSchema = userSettingsScalarFieldsSchema;

/** The descriptive half of an item, shared by every format version. */
const itemMetadataSchema = z.object({
	type: z.string(),
	title: z.string(),
	description: z.string().nullable(),
	coverImageUrl: z.string().nullable(),
	releaseDate: z.string().nullable(),
	externalId: z.string(),
	externalSource: z.string(),
	metadata: z.unknown().optional(),
});

const itemTrackingSchema = z.object({
	id: z.number().int(),
	seriesId: z.number().int().nullable(),
	creatorId: z.number().int().nullable().optional(),
	genreId: z.number().int().nullable().optional(),
	status: z.string(),
	purchaseStatus: z.enum(["not_purchased", "want_to_buy", "purchased"]),
	expectedReleaseDate: z.string().nullable().optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

const backupSchemaV5 = z.object({
	version: z.literal(5),
	exportedAt: z.string(),
	series: z.array(seriesBackupSchema),
	mediaItems: z.array(itemTrackingSchema.merge(itemMetadataSchema)),
	mediaItemInstances: z.array(instanceBackupSchema),
	views: z.array(viewBackupSchema),
	viewItemOrder: z.array(viewItemOrderBackupSchema),
	tags: z.array(tagBackupSchema),
	mediaItemTags: z.array(mediaItemTagBackupSchema),
	creators: z.array(creatorBackupSchema),
	genres: z.array(genreBackupSchema),
	userSettings: userSettingsBackupSchema.nullable(),
});

const backupSchemaV4 = z.object({
	version: z.literal(4),
	exportedAt: z.string(),
	series: z.array(seriesBackupSchema),
	mediaItems: z.array(itemTrackingSchema.merge(itemMetadataSchema)),
	mediaItemInstances: z.array(instanceBackupSchema),
	views: z.array(viewBackupSchema),
	viewItemOrder: z.array(viewItemOrderBackupSchema),
	tags: z.array(tagBackupSchema),
	mediaItemTags: z.array(mediaItemTagBackupSchema),
	creators: z.array(creatorBackupSchema),
	genres: z.array(genreBackupSchema),
	customReports: z.array(customReportBackupSchema),
	userSettings: userSettingsBackupSchemaLegacy.nullable(),
});

const backupSchemaV3 = z.object({
	version: z.literal(3),
	exportedAt: z.string(),
	series: z.array(seriesBackupSchema),
	mediaItems: z.array(itemTrackingSchema.merge(itemMetadataSchema)),
	mediaItemInstances: z.array(instanceBackupSchema),
	views: z.array(viewBackupSchema),
	tags: z.array(tagBackupSchema),
	mediaItemTags: z.array(mediaItemTagBackupSchema),
	creators: z.array(creatorBackupSchema),
	genres: z.array(genreBackupSchema),
	customReports: z.array(customReportBackupSchema),
	userSettings: userSettingsBackupSchemaLegacy.nullable(),
});

const backupSchemaV2 = z.object({
	version: z.literal(2),
	exportedAt: z.string(),
	series: z.array(seriesBackupSchema),
	mediaItems: z.array(itemTrackingSchema.merge(itemMetadataSchema)),
	mediaItemInstances: z.array(instanceBackupSchema),
	views: z.array(viewBackupSchema),
});

const backupSchemaV1 = z.object({
	version: z.literal(1),
	exportedAt: z.string(),
	series: z.array(seriesBackupSchema),
	mediaItemMetadata: z.array(
		itemMetadataSchema.extend({
			id: z.number().int(),
			createdAt: z.string(),
		}),
	),
	mediaItems: z.array(
		itemTrackingSchema.extend({ mediaItemMetadataId: z.number().int() }),
	),
	mediaItemInstances: z.array(instanceBackupSchema),
	views: z.array(viewBackupSchema),
});

export const backupSchema = z.discriminatedUnion("version", [
	backupSchemaV1,
	backupSchemaV2,
	backupSchemaV3,
	backupSchemaV4,
	backupSchemaV5,
]);

/**
 * The shape of a backup file as it comes back off disk. Timestamps are strings
 * here, not Dates: a backup is JSON, so `exportBackup`'s Date columns have
 * already been serialized by the time anyone re-reads one.
 */
export type BackupData = z.infer<typeof backupSchema>;
type BackupV5 = z.infer<typeof backupSchemaV5>;

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export async function importBackup(
	rawBackup: BackupData,
	userId: string,
): Promise<void> {
	const backup = normalizeToV5(rawBackup);

	await db.transaction(async (tx) => {
		await deleteExistingUserData(tx, userId);

		const seriesIdMap = await restoreSeries(tx, userId, backup.series);
		const creatorIdMap = await restoreCreators(tx, userId, backup.creators);
		const genreIdMap = await restoreGenres(tx, userId, backup.genres);
		const tagIdMap = await restoreTags(tx, userId, backup.tags);
		const itemIdMap = await restoreMediaItems(tx, userId, backup.mediaItems, {
			seriesIdMap,
			creatorIdMap,
			genreIdMap,
		});
		await restoreMediaItemInstances(tx, backup.mediaItemInstances, itemIdMap);
		await restoreMediaItemTagLinks(
			tx,
			backup.mediaItemTags,
			itemIdMap,
			tagIdMap,
		);
		const viewIdMap = await restoreViews(tx, userId, backup.views);
		await restoreViewItemOrder(tx, backup.viewItemOrder, viewIdMap, itemIdMap);
		await restoreUserSettings(tx, userId, backup.userSettings);
	});
}

// ---------------------------------------------------------------------------
// Import — one restore step per table
// ---------------------------------------------------------------------------

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Settings and views go first because they point at other rows, then items
 * — whose delete cascades to instances and tag links — and only then the
 * rows items point at.
 */
async function deleteExistingUserData(tx: Tx, userId: string): Promise<void> {
	await tx.delete(userSettings).where(eq(userSettings.userId, userId));
	await tx.delete(views).where(eq(views.userId, userId));
	await tx.delete(mediaItems).where(eq(mediaItems.userId, userId));
	await tx.delete(series).where(eq(series.userId, userId));
	await tx.delete(creators).where(eq(creators.userId, userId));
	await tx.delete(genres).where(eq(genres.userId, userId));
	await tx.delete(tags).where(eq(tags.userId, userId));
}

async function restoreSeries(
	tx: Tx,
	userId: string,
	rows: BackupV5["series"],
): Promise<Map<number, number>> {
	const idMap = new Map<number, number>();
	for (const seriesRow of rows) {
		const [inserted] = await tx
			.insert(series)
			.values({
				userId,
				name: seriesRow.name,
				type: seriesRow.type as typeof series.$inferInsert.type,
				status: seriesRow.status as typeof series.$inferInsert.status,
				rating: seriesRow.rating,
				description: seriesRow.description,
				isComplete: seriesRow.isComplete,
				nextItemStatus: (seriesRow.nextItemStatus ??
					null) as typeof series.$inferInsert.nextItemStatus,
				createdAt: new Date(seriesRow.createdAt),
				updatedAt: new Date(seriesRow.updatedAt),
			})
			.returning({ id: series.id });
		idMap.set(seriesRow.id, inserted.id);
	}
	return idMap;
}

async function restoreCreators(
	tx: Tx,
	userId: string,
	rows: BackupV5["creators"],
): Promise<Map<number, number>> {
	const idMap = new Map<number, number>();
	for (const creatorRow of rows) {
		const [inserted] = await tx
			.insert(creators)
			.values({
				userId,
				name: creatorRow.name,
				biography: creatorRow.biography,
				createdAt: new Date(creatorRow.createdAt),
				updatedAt: new Date(creatorRow.updatedAt),
			})
			.returning({ id: creators.id });
		idMap.set(creatorRow.id, inserted.id);
	}
	return idMap;
}

async function restoreGenres(
	tx: Tx,
	userId: string,
	rows: BackupV5["genres"],
): Promise<Map<number, number>> {
	const idMap = new Map<number, number>();
	for (const genreRow of rows) {
		const [inserted] = await tx
			.insert(genres)
			.values({
				userId,
				name: genreRow.name,
				createdAt: new Date(genreRow.createdAt),
			})
			.returning({ id: genres.id });
		idMap.set(genreRow.id, inserted.id);
	}
	return idMap;
}

async function restoreTags(
	tx: Tx,
	userId: string,
	rows: BackupV5["tags"],
): Promise<Map<number, number>> {
	const idMap = new Map<number, number>();
	for (const tagRow of rows) {
		const [inserted] = await tx
			.insert(tags)
			.values({
				userId,
				name: tagRow.name,
				createdAt: new Date(tagRow.createdAt),
			})
			.returning({ id: tags.id });
		idMap.set(tagRow.id, inserted.id);
	}
	return idMap;
}

/** Maps an old foreign-key id through its restored id map, or null if either is absent. */
function mapForeignId(
	id: number | null | undefined,
	idMap: Map<number, number>,
): number | null {
	if (id == null) {
		return null;
	}
	return idMap.get(id) ?? null;
}

async function restoreMediaItems(
	tx: Tx,
	userId: string,
	rows: BackupV5["mediaItems"],
	idMaps: {
		seriesIdMap: Map<number, number>;
		creatorIdMap: Map<number, number>;
		genreIdMap: Map<number, number>;
	},
): Promise<Map<number, number>> {
	const idMap = new Map<number, number>();
	for (const itemRow of rows) {
		const [inserted] = await tx
			.insert(mediaItems)
			.values({
				userId,
				type: itemRow.type as typeof mediaItems.$inferInsert.type,
				title: itemRow.title,
				description: itemRow.description,
				coverImageUrl: itemRow.coverImageUrl,
				releaseDate: itemRow.releaseDate,
				externalId: itemRow.externalId,
				externalSource: itemRow.externalSource,
				metadata: itemRow.metadata as typeof mediaItems.$inferInsert.metadata,
				seriesId: mapForeignId(itemRow.seriesId, idMaps.seriesIdMap),
				creatorId: mapForeignId(itemRow.creatorId, idMaps.creatorIdMap),
				genreId: mapForeignId(itemRow.genreId, idMaps.genreIdMap),
				status: itemRow.status as typeof mediaItems.$inferInsert.status,
				purchaseStatus: itemRow.purchaseStatus,
				expectedReleaseDate: itemRow.expectedReleaseDate ?? null,
				createdAt: new Date(itemRow.createdAt),
				updatedAt: new Date(itemRow.updatedAt),
			})
			.returning({ id: mediaItems.id });
		idMap.set(itemRow.id, inserted.id);
	}
	return idMap;
}

async function restoreMediaItemInstances(
	tx: Tx,
	rows: BackupV5["mediaItemInstances"],
	itemIdMap: Map<number, number>,
): Promise<void> {
	for (const instanceRow of rows) {
		const newItemId = itemIdMap.get(instanceRow.mediaItemId);
		if (newItemId === undefined) {
			continue;
		}
		await tx.insert(mediaItemInstances).values({
			mediaItemId: newItemId,
			rating: instanceRow.rating,
			fictionRating:
				instanceRow.fictionRating as typeof mediaItemInstances.$inferInsert.fictionRating,
			seasonReviews: (instanceRow.seasonReviews ??
				null) as typeof mediaItemInstances.$inferInsert.seasonReviews,
			consumptionInfo: (instanceRow.consumptionInfo ??
				null) as typeof mediaItemInstances.$inferInsert.consumptionInfo,
			reviewText: instanceRow.reviewText,
			startedAt: instanceRow.startedAt,
			completedAt: instanceRow.completedAt,
			createdAt: new Date(instanceRow.createdAt),
			updatedAt: new Date(instanceRow.updatedAt),
		});
	}
}

/** Skips any link whose item or tag end is missing from the restored maps. */
async function restoreMediaItemTagLinks(
	tx: Tx,
	rows: BackupV5["mediaItemTags"],
	itemIdMap: Map<number, number>,
	tagIdMap: Map<number, number>,
): Promise<void> {
	for (const linkRow of rows) {
		const newItemId = itemIdMap.get(linkRow.mediaItemId);
		const newTagId = tagIdMap.get(linkRow.tagId);
		if (newItemId === undefined || newTagId === undefined) {
			continue;
		}
		await tx
			.insert(mediaItemTags)
			.values({ mediaItemId: newItemId, tagId: newTagId });
	}
}

async function restoreViews(
	tx: Tx,
	userId: string,
	rows: BackupV5["views"],
): Promise<Map<number, number>> {
	const idMap = new Map<number, number>();
	for (const viewRow of rows) {
		const [inserted] = await tx
			.insert(views)
			.values({
				userId,
				name: viewRow.name,
				subject: viewRow.subject as ViewSubject,
				filters: viewRow.filters as typeof views.$inferInsert.filters,
				displayOrder: viewRow.displayOrder,
				createdAt: new Date(viewRow.createdAt),
				updatedAt: new Date(viewRow.updatedAt),
			})
			.returning({ id: views.id });
		idMap.set(viewRow.id, inserted.id);
	}
	return idMap;
}

/** Skips any order row whose view or item end is missing from the restored maps. */
async function restoreViewItemOrder(
	tx: Tx,
	rows: BackupV5["viewItemOrder"],
	viewIdMap: Map<number, number>,
	itemIdMap: Map<number, number>,
): Promise<void> {
	for (const orderRow of rows) {
		const newViewId = viewIdMap.get(orderRow.viewId);
		const newItemId = itemIdMap.get(orderRow.mediaItemId);
		if (newViewId === undefined || newItemId === undefined) {
			continue;
		}
		await tx.insert(viewItemOrder).values({
			viewId: newViewId,
			mediaItemId: newItemId,
			position: orderRow.position,
		});
	}
}

async function restoreUserSettings(
	tx: Tx,
	userId: string,
	settings: BackupV5["userSettings"],
): Promise<void> {
	if (!settings) {
		return;
	}
	await tx.insert(userSettings).values({
		userId,
		defaultLibrarySortBy:
			settings.defaultLibrarySortBy as typeof userSettings.$inferInsert.defaultLibrarySortBy,
		defaultLibrarySortDirection:
			settings.defaultLibrarySortDirection as typeof userSettings.$inferInsert.defaultLibrarySortDirection,
		defaultSeriesSortBy:
			settings.defaultSeriesSortBy as typeof userSettings.$inferInsert.defaultSeriesSortBy,
		defaultSeriesSortDirection:
			settings.defaultSeriesSortDirection as typeof userSettings.$inferInsert.defaultSeriesSortDirection,
		defaultBookConsumptionMethod:
			settings.defaultBookConsumptionMethod as typeof userSettings.$inferInsert.defaultBookConsumptionMethod,
		defaultMovieConsumptionMethod:
			settings.defaultMovieConsumptionMethod as typeof userSettings.$inferInsert.defaultMovieConsumptionMethod,
		defaultTvShowConsumptionMethod:
			settings.defaultTvShowConsumptionMethod as typeof userSettings.$inferInsert.defaultTvShowConsumptionMethod,
		defaultGamePlatform:
			settings.defaultGamePlatform as typeof userSettings.$inferInsert.defaultGamePlatform,
		defaultGameControlMethod:
			settings.defaultGameControlMethod as typeof userSettings.$inferInsert.defaultGameControlMethod,
		createdAt: new Date(settings.createdAt),
		updatedAt: new Date(settings.updatedAt),
	});
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Drops the v1–v4-only `activeCustomReportId` field from a legacy settings row, if present. */
function dropActiveCustomReportId(
	settings: z.infer<typeof userSettingsBackupSchemaLegacy> | null,
): z.infer<typeof userSettingsBackupSchema> | null {
	if (!settings) {
		return null;
	}
	const { activeCustomReportId: _ignored, ...rest } = settings;
	return rest;
}

/**
 * Lifts a v1–v4 backup into the v5 shape.
 *
 * The tables each later version added were never exported by the older formats,
 * so they come back empty — a pre-v5 file restores its views intact, their items
 * simply all sort as unplaced. `creatorId` and `genreId` are dropped for the same
 * reason: an old file carries the ids but not the `creators`/`genres` rows they
 * point at, so keeping them would attach items to whatever happens to hold that
 * id now. Any custom-reports data a v1–v4 file carries is dropped the same way —
 * the feature no longer exists, so there is nothing left to attach it to.
 *
 * The v1 lift additionally joins each item to the metadata row it references.
 * Items whose metadata row is missing are dropped, matching the importer's
 * long-standing behavior; metadata rows no item references are unreachable and
 * disappear with the join.
 */
const LIFT_TO_V5: Record<
	BackupData["version"],
	(backup: BackupData) => BackupV5
> = {
	5: (backup) => backup as BackupV5,
	4: (backup) => liftV4ToV5(backup as z.infer<typeof backupSchemaV4>),
	3: (backup) => liftV3ToV5(backup as z.infer<typeof backupSchemaV3>),
	2: (backup) => liftV2ToV5(backup as z.infer<typeof backupSchemaV2>),
	1: (backup) => liftV1ToV5(backup as z.infer<typeof backupSchemaV1>),
};

function normalizeToV5(backup: BackupData): BackupV5 {
	return LIFT_TO_V5[backup.version](backup);
}

function liftV4ToV5(backup: z.infer<typeof backupSchemaV4>): BackupV5 {
	const { customReports: _customReports, ...rest } = backup;
	return {
		...rest,
		version: 5,
		userSettings: dropActiveCustomReportId(backup.userSettings),
	};
}

function liftV3ToV5(backup: z.infer<typeof backupSchemaV3>): BackupV5 {
	const { customReports: _customReports, ...rest } = backup;
	return {
		...rest,
		viewItemOrder: [],
		version: 5,
		userSettings: dropActiveCustomReportId(backup.userSettings),
	};
}

function liftV2ToV5(backup: z.infer<typeof backupSchemaV2>): BackupV5 {
	return {
		...backup,
		version: 5,
		viewItemOrder: [],
		tags: [],
		mediaItemTags: [],
		creators: [],
		genres: [],
		userSettings: null,
		mediaItems: backup.mediaItems.map((item) => ({
			...item,
			creatorId: null,
			genreId: null,
		})),
	};
}

function liftV1ToV5(backup: z.infer<typeof backupSchemaV1>): BackupV5 {
	const metadataById = new Map(
		backup.mediaItemMetadata.map((row) => [row.id, row]),
	);

	const mediaItemsWithMetadata = backup.mediaItems.flatMap((item) => {
		const metadataRow = metadataById.get(item.mediaItemMetadataId);
		if (!metadataRow) {
			return [];
		}

		const { mediaItemMetadataId: _ignored, ...tracking } = item;
		return [
			{
				...tracking,
				creatorId: null,
				genreId: null,
				type: metadataRow.type,
				title: metadataRow.title,
				description: metadataRow.description,
				coverImageUrl: metadataRow.coverImageUrl,
				releaseDate: metadataRow.releaseDate,
				externalId: metadataRow.externalId,
				externalSource: metadataRow.externalSource,
				metadata: metadataRow.metadata,
			},
		];
	});

	return {
		version: 5,
		exportedAt: backup.exportedAt,
		series: backup.series,
		mediaItems: mediaItemsWithMetadata,
		mediaItemInstances: backup.mediaItemInstances,
		views: backup.views,
		viewItemOrder: [],
		tags: [],
		mediaItemTags: [],
		creators: [],
		genres: [],
		userSettings: null,
	};
}
