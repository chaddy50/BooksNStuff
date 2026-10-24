import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#/database/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/features/screens/auth", () => ({ auth: {} }));
vi.mock("#/features/screens/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import { eq } from "drizzle-orm";
import { mediaItemInstances, mediaItems, series } from "#/database/schema";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import { testDb } from "#/tests/integration/db";
import {
	insertCreator,
	insertInstance,
	insertMediaItem,
	insertSeries,
	truncateAll,
} from "#/tests/integration/helpers";
import {
	getMediaItemDetailsForUser,
	removeFromLibrary,
	saveInstanceForUser,
	updateMediaItemCreator,
	updateMediaItemMetadata,
	updateMediaItemSeries,
	updateMediaItemStatusForUser,
} from "../mediaItemDetails.server";

const USER_A = "user-a";
const USER_B = "user-b";

/** The same external item, held independently by both users. */
const SHARED_EXTERNAL = {
	externalId: "tmdb-438631",
	externalSource: "tmdb",
} as const;

beforeEach(() => truncateAll());

async function seedBothUsersOwnSameItem(type = MediaItemType.MOVIE) {
	const itemA = await insertMediaItem({
		userId: USER_A,
		type,
		title: "Dune",
		description: "A description",
		coverImageUrl: "http://example.test/a.jpg",
		metadata: { director: "Denis Villeneuve" },
		...SHARED_EXTERNAL,
	});
	const itemB = await insertMediaItem({
		userId: USER_B,
		type,
		title: "Dune",
		description: "A description",
		coverImageUrl: "http://example.test/a.jpg",
		metadata: { director: "Denis Villeneuve" },
		...SHARED_EXTERNAL,
	});
	return { itemA, itemB };
}

async function readItem(id: number) {
	const [row] = await testDb
		.select()
		.from(mediaItems)
		.where(eq(mediaItems.id, id));
	return row;
}

describe("updateMediaItemMetadata", () => {
	it("writes all five editable fields onto the caller's item", async () => {
		const { itemA } = await seedBothUsersOwnSameItem();

		await updateMediaItemMetadata(
			{
				mediaItemId: itemA,
				title: "Dune: Part One",
				description: "New description",
				coverImageUrl: "http://example.test/new.jpg",
				releaseDate: "2021-10-22",
				metadata: { director: "DV", runtime: 155 },
			},
			USER_A,
		);

		const row = await readItem(itemA);
		expect(row?.title).toBe("Dune: Part One");
		expect(row?.description).toBe("New description");
		expect(row?.coverImageUrl).toBe("http://example.test/new.jpg");
		expect(row?.releaseDate).toBe("2021-10-22");
		expect(row?.metadata).toEqual({ director: "DV", runtime: 155 });
	});

	// The bug this whole change exists to kill.
	it("leaves the other user's copy of the same external item untouched", async () => {
		const { itemA, itemB } = await seedBothUsersOwnSameItem();
		const before = await readItem(itemB);

		await updateMediaItemMetadata(
			{
				mediaItemId: itemA,
				title: "A's custom title",
				coverImageUrl: "http://example.test/a-custom.jpg",
				metadata: { director: "A's correction" },
			},
			USER_A,
		);

		expect(await readItem(itemB)).toEqual(before);
	});

	// Closes the hole where the handler never resolved the caller at all.
	it("mutates zero rows for a mediaItemId the caller does not own", async () => {
		const { itemB } = await seedBothUsersOwnSameItem();
		const before = await readItem(itemB);

		await updateMediaItemMetadata(
			{ mediaItemId: itemB, title: "Stolen", metadata: {} },
			USER_A,
		);

		expect(await readItem(itemB)).toEqual(before);
	});

	it("mutates nothing for a mediaItemId that does not exist", async () => {
		const { itemA } = await seedBothUsersOwnSameItem();
		const before = await readItem(itemA);

		await expect(
			updateMediaItemMetadata(
				{ mediaItemId: 999_999, title: "Ghost", metadata: {} },
				USER_A,
			),
		).resolves.toBeUndefined();

		expect(await readItem(itemA)).toEqual(before);
	});

	it("nulls optional fields passed as empty strings", async () => {
		const { itemA } = await seedBothUsersOwnSameItem();

		await updateMediaItemMetadata(
			{
				mediaItemId: itemA,
				title: "Dune",
				description: "",
				coverImageUrl: "",
				releaseDate: "",
				metadata: {},
			},
			USER_A,
		);

		const row = await readItem(itemA);
		expect(row?.description).toBeNull();
		expect(row?.coverImageUrl).toBeNull();
		expect(row?.releaseDate).toBeNull();
	});

	it("recomputes the generated sortTitle after a title change", async () => {
		const { itemA } = await seedBothUsersOwnSameItem();

		await updateMediaItemMetadata(
			{ mediaItemId: itemA, title: "The Hobbit", metadata: {} },
			USER_A,
		);

		expect((await readItem(itemA))?.sortTitle).toBe("Hobbit");
	});
});

describe("updateMediaItemSeries", () => {
	it("sets the JSONB series key on the caller's item only", async () => {
		const { itemA, itemB } = await seedBothUsersOwnSameItem();
		const beforeB = await readItem(itemB);
		const seriesId = await insertSeries({
			userId: USER_A,
			name: "The Dune Saga",
			type: MediaItemType.MOVIE,
		});

		await updateMediaItemSeries(
			{ mediaItemId: itemA, type: MediaItemType.MOVIE, seriesId },
			USER_A,
		);

		const rowA = await readItem(itemA);
		expect(rowA?.seriesId).toBe(seriesId);
		expect((rowA?.metadata as Record<string, unknown>).series).toBe(
			"The Dune Saga",
		);
		expect(await readItem(itemB)).toEqual(beforeB);
	});

	it("removes the JSONB series key when seriesId is null", async () => {
		const itemA = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			metadata: { director: "DV", series: "The Dune Saga" },
		});

		await updateMediaItemSeries(
			{ mediaItemId: itemA, type: MediaItemType.MOVIE, seriesId: null },
			USER_A,
		);

		const metadata = (await readItem(itemA))?.metadata as Record<
			string,
			unknown
		>;
		expect(metadata).not.toHaveProperty("series");
		expect(metadata.director).toBe("DV");
	});

	it("recomputes seriesSortName from the new series name", async () => {
		const itemA = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.TV_SHOW,
			metadata: {},
		});
		const seriesId = await insertSeries({
			userId: USER_A,
			name: "The Expanse",
			type: MediaItemType.TV_SHOW,
		});

		await updateMediaItemSeries(
			{ mediaItemId: itemA, type: MediaItemType.TV_SHOW, seriesId },
			USER_A,
		);

		expect((await readItem(itemA))?.seriesSortName).toBe("Expanse");
	});

	it("changes nothing for a mediaItemId owned by another user", async () => {
		const { itemB } = await seedBothUsersOwnSameItem();
		const before = await readItem(itemB);
		const seriesId = await insertSeries({
			userId: USER_A,
			name: "A's series",
			type: MediaItemType.MOVIE,
		});

		await updateMediaItemSeries(
			{ mediaItemId: itemB, type: MediaItemType.MOVIE, seriesId },
			USER_A,
		);

		expect(await readItem(itemB)).toEqual(before);
	});
});

describe("updateMediaItemCreator", () => {
	const CREATOR_KEY_BY_TYPE = [
		[MediaItemType.BOOK, "author"],
		[MediaItemType.MOVIE, "director"],
		[MediaItemType.TV_SHOW, "creator"],
		[MediaItemType.PODCAST, "creator"],
		[MediaItemType.VIDEO_GAME, "developer"],
	] as const;

	it.each(CREATOR_KEY_BY_TYPE)(
		"writes the %s creator name into the '%s' JSONB key",
		async (type, expectedKey) => {
			const itemId = await insertMediaItem({
				userId: USER_A,
				type,
				metadata: {},
			});
			const creatorId = await insertCreator({
				userId: USER_A,
				name: "Jane Doe",
			});

			await updateMediaItemCreator(
				{ mediaItemId: itemId, type, creatorId },
				USER_A,
			);

			const metadata = (await readItem(itemId))?.metadata as Record<
				string,
				unknown
			>;
			expect(metadata[expectedKey]).toBe("Jane Doe");
		},
	);

	it("leaves the other user's identical item untouched", async () => {
		const { itemA, itemB } = await seedBothUsersOwnSameItem();
		const beforeB = await readItem(itemB);
		const creatorId = await insertCreator({
			userId: USER_A,
			name: "Denis Villeneuve",
		});

		await updateMediaItemCreator(
			{ mediaItemId: itemA, type: MediaItemType.MOVIE, creatorId },
			USER_A,
		);

		expect(await readItem(itemB)).toEqual(beforeB);
	});

	it("removes the type's creator key when creatorId is null, keeping siblings", async () => {
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			metadata: { director: "DV", runtime: 155 },
		});

		await updateMediaItemCreator(
			{ mediaItemId: itemId, type: MediaItemType.MOVIE, creatorId: null },
			USER_A,
		);

		const metadata = (await readItem(itemId))?.metadata as Record<
			string,
			unknown
		>;
		expect(metadata).not.toHaveProperty("director");
		expect(metadata.runtime).toBe(155);
	});

	it("rejects a mediaItemId owned by another user", async () => {
		const { itemB } = await seedBothUsersOwnSameItem();
		const before = await readItem(itemB);
		const creatorId = await insertCreator({ userId: USER_A, name: "Someone" });

		await expect(
			updateMediaItemCreator(
				{ mediaItemId: itemB, type: MediaItemType.MOVIE, creatorId },
				USER_A,
			),
		).rejects.toThrow("Unauthorized");

		expect(await readItem(itemB)).toEqual(before);
	});
});

describe("removeFromLibrary", () => {
	it("deletes only the caller's item and cascades its instances", async () => {
		const { itemA, itemB } = await seedBothUsersOwnSameItem();
		await insertInstance({ mediaItemId: itemA, completedAt: "2024-01-01" });
		await insertInstance({ mediaItemId: itemB, completedAt: "2024-02-01" });

		await removeFromLibrary(itemA, USER_A);

		expect(await readItem(itemA)).toBeUndefined();
		expect(await readItem(itemB)).toBeDefined();

		const instancesA = await testDb
			.select()
			.from(mediaItemInstances)
			.where(eq(mediaItemInstances.mediaItemId, itemA));
		const instancesB = await testDb
			.select()
			.from(mediaItemInstances)
			.where(eq(mediaItemInstances.mediaItemId, itemB));
		expect(instancesA).toHaveLength(0);
		expect(instancesB).toHaveLength(1);
	});

	// The orphan-metadata cleanup that used to reach across users is gone.
	it("cannot delete another user's data", async () => {
		const { itemA, itemB } = await seedBothUsersOwnSameItem();
		const beforeB = await readItem(itemB);

		await removeFromLibrary(itemA, USER_A);

		expect(await readItem(itemB)).toEqual(beforeB);
	});

	it("deletes a now-empty series but keeps one that still has items", async () => {
		const emptySeriesId = await insertSeries({
			userId: USER_A,
			name: "Solo",
			type: MediaItemType.MOVIE,
		});
		const sharedSeriesId = await insertSeries({
			userId: USER_A,
			name: "Trilogy",
			type: MediaItemType.MOVIE,
		});
		const onlyItem = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			seriesId: emptySeriesId,
		});
		const firstOfTwo = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			seriesId: sharedSeriesId,
		});
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.MOVIE,
			seriesId: sharedSeriesId,
		});

		await removeFromLibrary(onlyItem, USER_A);
		await removeFromLibrary(firstOfTwo, USER_A);

		const remaining = await testDb.select().from(series);
		expect(remaining.map((row) => row.id)).toEqual([sharedSeriesId]);
	});

	it("is a no-op for an unowned mediaItemId", async () => {
		const { itemB } = await seedBothUsersOwnSameItem();

		await removeFromLibrary(itemB, USER_A);

		expect(await readItem(itemB)).toBeDefined();
	});
});

describe("saveInstanceForUser / getMediaItemDetailsForUser progress", () => {
	it("round-trips a saved progressPercent onto the instance", async () => {
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
		});
		const instanceId = await insertInstance({
			mediaItemId: itemId,
			startedAt: "2024-01-01",
		});

		await saveInstanceForUser(
			{ mediaItemId: itemId, instanceId, progressPercent: "42" },
			USER_A,
		);

		const details = await getMediaItemDetailsForUser(itemId, USER_A);
		expect(details.instances[0].progressPercent).toBe(42);
	});

	it("round-trips a fractional progressPercent without losing precision", async () => {
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
		});
		const instanceId = await insertInstance({
			mediaItemId: itemId,
			startedAt: "2024-01-01",
		});

		await saveInstanceForUser(
			{ mediaItemId: itemId, instanceId, progressPercent: "41.6667" },
			USER_A,
		);

		const details = await getMediaItemDetailsForUser(itemId, USER_A);
		expect(details.instances[0].progressPercent).toBe(41.6667);
	});

	it("clears progressPercent back to null when omitted on a later save", async () => {
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
		});
		const instanceId = await insertInstance({
			mediaItemId: itemId,
			startedAt: "2024-01-01",
			progressPercent: "42",
		});

		await saveInstanceForUser({ mediaItemId: itemId, instanceId }, USER_A);

		const details = await getMediaItemDetailsForUser(itemId, USER_A);
		expect(details.instances[0].progressPercent).toBeNull();
	});

	it("forces progressPercent to 100 when completedAt is saved, overriding the input value", async () => {
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
		});
		const instanceId = await insertInstance({
			mediaItemId: itemId,
			startedAt: "2024-01-01",
		});

		await saveInstanceForUser(
			{
				mediaItemId: itemId,
				instanceId,
				completedAt: "2024-01-15",
				progressPercent: "42",
			},
			USER_A,
		);

		const details = await getMediaItemDetailsForUser(itemId, USER_A);
		expect(details.instances[0].progressPercent).toBe(100);
	});

	it("keeps the given progressPercent when completedAt is not set", async () => {
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
		});
		const instanceId = await insertInstance({
			mediaItemId: itemId,
			startedAt: "2024-01-01",
		});

		await saveInstanceForUser(
			{ mediaItemId: itemId, instanceId, progressPercent: "42" },
			USER_A,
		);

		const details = await getMediaItemDetailsForUser(itemId, USER_A);
		expect(details.instances[0].progressPercent).toBe(42);
	});

	it("keeps the given progressPercent when completedAt is cleared back to empty", async () => {
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
		});
		const instanceId = await insertInstance({
			mediaItemId: itemId,
			startedAt: "2024-01-01",
			completedAt: "2024-01-15",
		});

		await saveInstanceForUser(
			{
				mediaItemId: itemId,
				instanceId,
				completedAt: "",
				progressPercent: "42",
			},
			USER_A,
		);

		const details = await getMediaItemDetailsForUser(itemId, USER_A);
		expect(details.instances[0].progressPercent).toBe(42);
	});

	it("does not update an instance belonging to another user's item", async () => {
		const { itemB } = await seedBothUsersOwnSameItem();
		const instanceId = await insertInstance({
			mediaItemId: itemB,
			startedAt: "2024-01-01",
		});

		await expect(
			saveInstanceForUser(
				{ mediaItemId: itemB, instanceId, progressPercent: "90" },
				USER_A,
			),
		).rejects.toThrow("Media item not found");

		const details = await getMediaItemDetailsForUser(itemB, USER_B);
		expect(details.instances[0].progressPercent).toBeNull();
	});

	it("reverts the item to BACKLOG when the only instance's dates are cleared", async () => {
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			status: MediaItemStatus.COMPLETED,
		});
		const instanceId = await insertInstance({
			mediaItemId: itemId,
			startedAt: "2024-01-01",
			completedAt: "2024-01-15",
		});

		await saveInstanceForUser({ mediaItemId: itemId, instanceId }, USER_A);

		expect((await readItem(itemId))?.status).toBe(MediaItemStatus.BACKLOG);
	});

	it("keeps the item IN_PROGRESS when editing an older completed instance while a newer one is unfinished", async () => {
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			status: MediaItemStatus.IN_PROGRESS,
		});
		const olderInstanceId = await insertInstance({
			mediaItemId: itemId,
			startedAt: "2023-01-01",
			completedAt: "2023-01-15",
		});
		await insertInstance({
			mediaItemId: itemId,
			startedAt: "2024-01-01",
		});

		await saveInstanceForUser(
			{
				mediaItemId: itemId,
				instanceId: olderInstanceId,
				startedAt: "2023-01-01",
				completedAt: "2023-01-15",
				rating: "4",
			},
			USER_A,
		);

		expect((await readItem(itemId))?.status).toBe(MediaItemStatus.IN_PROGRESS);
	});
});

describe("updateMediaItemStatusForUser", () => {
	it("sets the unfinished instance's progressPercent to 100 when completing", async () => {
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			status: MediaItemStatus.IN_PROGRESS,
		});
		const instanceId = await insertInstance({
			mediaItemId: itemId,
			startedAt: "2024-01-01",
			progressPercent: "42",
		});

		await updateMediaItemStatusForUser(
			itemId,
			MediaItemStatus.COMPLETED,
			USER_A,
		);

		const details = await getMediaItemDetailsForUser(itemId, USER_A);
		const instance = details.instances.find((i) => i.id === instanceId);
		expect(instance?.progressPercent).toBe(100);
		expect(instance?.completedAt).not.toBeNull();
	});

	it("leaves the unfinished instance's progressPercent untouched when dropping", async () => {
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			status: MediaItemStatus.IN_PROGRESS,
		});
		const instanceId = await insertInstance({
			mediaItemId: itemId,
			startedAt: "2024-01-01",
			progressPercent: "42",
		});

		await updateMediaItemStatusForUser(itemId, MediaItemStatus.DROPPED, USER_A);

		const details = await getMediaItemDetailsForUser(itemId, USER_A);
		const instance = details.instances.find((i) => i.id === instanceId);
		expect(instance?.progressPercent).toBe(42);
		expect(instance?.completedAt).toBeNull();
	});

	it("creates a new unfinished instance when starting an item with none", async () => {
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			status: MediaItemStatus.BACKLOG,
		});

		await updateMediaItemStatusForUser(
			itemId,
			MediaItemStatus.IN_PROGRESS,
			USER_A,
		);

		const details = await getMediaItemDetailsForUser(itemId, USER_A);
		expect(details.instances).toHaveLength(1);
		expect(details.instances[0]?.startedAt).not.toBeNull();
		expect(details.instances[0]?.completedAt).toBeNull();
	});
});
