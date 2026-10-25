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
import { mediaItems, series } from "#/database/schema";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import { testDb } from "#/tests/integration/db";
import {
	insertMediaItem,
	insertSeries,
	truncateAll,
} from "#/tests/integration/helpers";
import {
	confirmSeriesCompletion,
	updateSeriesMetadata,
} from "../seriesDetails.server";

const USER_A = "user-a";
const USER_B = "user-b";

const SHARED_EXTERNAL = {
	externalId: "tmdb-63639",
	externalSource: "tmdb",
} as const;

beforeEach(() => truncateAll());

async function readItem(id: number) {
	const [row] = await testDb
		.select()
		.from(mediaItems)
		.where(eq(mediaItems.id, id));
	return row;
}

describe("updateSeriesMetadata", () => {
	it("writes the new name into every linked item's series key", async () => {
		const seriesId = await insertSeries({
			userId: USER_A,
			name: "Old Name",
			type: MediaItemType.TV_SHOW,
		});
		const first = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.TV_SHOW,
			seriesId,
			metadata: { series: "Old Name" },
		});
		const second = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.TV_SHOW,
			seriesId,
			metadata: { series: "Old Name" },
		});

		await updateSeriesMetadata(
			{ seriesId, name: "New Name", isComplete: false },
			USER_A,
		);

		expect((await readItem(first))?.metadata).toMatchObject({
			series: "New Name",
		});
		expect((await readItem(second))?.metadata).toMatchObject({
			series: "New Name",
		});
	});

	it("leaves the other user's copy of the same external item untouched", async () => {
		const seriesId = await insertSeries({
			userId: USER_A,
			name: "Old Name",
			type: MediaItemType.TV_SHOW,
		});
		const itemA = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.TV_SHOW,
			seriesId,
			metadata: { series: "Old Name" },
			...SHARED_EXTERNAL,
		});
		const itemB = await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.TV_SHOW,
			metadata: { series: "Old Name" },
			...SHARED_EXTERNAL,
		});

		await updateSeriesMetadata(
			{ seriesId, name: "New Name", isComplete: false },
			USER_A,
		);

		expect((await readItem(itemA))?.metadata).toMatchObject({
			series: "New Name",
		});
		expect((await readItem(itemB))?.metadata).toMatchObject({
			series: "Old Name",
		});
	});

	it("recomputes the generated seriesSortName", async () => {
		const seriesId = await insertSeries({
			userId: USER_A,
			name: "Old",
			type: MediaItemType.TV_SHOW,
		});
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.TV_SHOW,
			seriesId,
			metadata: { series: "Old" },
		});

		await updateSeriesMetadata(
			{ seriesId, name: "The Expanse", isComplete: false },
			USER_A,
		);

		expect((await readItem(itemId))?.seriesSortName).toBe("Expanse");
	});

	// This call site coalesces NULL metadata to '{}', unlike creatorDetails.
	it("still writes the series key when metadata is SQL NULL", async () => {
		const seriesId = await insertSeries({
			userId: USER_A,
			name: "Old Name",
			type: MediaItemType.TV_SHOW,
		});
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.TV_SHOW,
			seriesId,
		});
		await testDb
			.update(mediaItems)
			.set({ metadata: null })
			.where(eq(mediaItems.id, itemId));

		await updateSeriesMetadata(
			{ seriesId, name: "New Name", isComplete: false },
			USER_A,
		);

		expect((await readItem(itemId))?.metadata).toEqual({ series: "New Name" });
	});

	it("writes no item metadata when the name is unchanged", async () => {
		const seriesId = await insertSeries({
			userId: USER_A,
			name: "Same",
			type: MediaItemType.TV_SHOW,
		});
		const itemId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.TV_SHOW,
			seriesId,
			metadata: { series: "Stale", other: "keep" },
		});

		await updateSeriesMetadata(
			{
				seriesId,
				name: "Same",
				description: "New description",
				isComplete: true,
			},
			USER_A,
		);

		expect((await readItem(itemId))?.metadata).toEqual({
			series: "Stale",
			other: "keep",
		});
		const [row] = await testDb
			.select()
			.from(series)
			.where(eq(series.id, seriesId));
		expect(row?.description).toBe("New description");
		expect(row?.isComplete).toBe(true);
	});

	it("is a no-op for a series owned by another user", async () => {
		const seriesB = await insertSeries({
			userId: USER_B,
			name: "B's series",
			type: MediaItemType.TV_SHOW,
		});
		const itemB = await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.TV_SHOW,
			seriesId: seriesB,
			metadata: { series: "B's series" },
		});

		await updateSeriesMetadata(
			{ seriesId: seriesB, name: "Hijacked", isComplete: false },
			USER_A,
		);

		expect((await readItem(itemB))?.metadata).toMatchObject({
			series: "B's series",
		});
		const [row] = await testDb
			.select()
			.from(series)
			.where(eq(series.id, seriesB));
		expect(row?.name).toBe("B's series");
	});
});

describe("confirmSeriesCompletion", () => {
	it("marks the series Complete and syncs its status to Done", async () => {
		const seriesId = await insertSeries({
			userId: USER_A,
			name: "Ongoing Trilogy",
			type: MediaItemType.BOOK,
		});
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			seriesId,
			status: MediaItemStatus.COMPLETED,
		});

		await confirmSeriesCompletion(seriesId, USER_A);

		const [row] = await testDb
			.select({ isComplete: series.isComplete, status: series.status })
			.from(series)
			.where(eq(series.id, seriesId));
		expect(row?.isComplete).toBe(true);
		expect(row?.status).toBe(MediaItemStatus.COMPLETED);
	});

	it("is a no-op for a series owned by another user", async () => {
		const seriesB = await insertSeries({
			userId: USER_B,
			name: "B's series",
			type: MediaItemType.BOOK,
		});

		await confirmSeriesCompletion(seriesB, USER_A);

		const [row] = await testDb
			.select({ isComplete: series.isComplete })
			.from(series)
			.where(eq(series.id, seriesB));
		expect(row?.isComplete).toBe(false);
	});
});
