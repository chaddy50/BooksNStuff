import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/lib/enums";

vi.mock("#/database/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/features/screens/auth", () => ({ auth: {} }));
vi.mock("#/features/screens/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import { testDb } from "#/tests/integration/db";
import {
	insertInstance,
	insertMediaItem,
	insertProgressUpdate,
	truncateAll,
} from "#/tests/integration/helpers";
import { fetchProgressByMonth } from "../progressByMonth.server";

const USER = "test-user";
const OTHER_USER = "other-user";
const START = "2024-01-01";
const END = "2024-03-15";

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// delta attribution
// ---------------------------------------------------------------------------

describe("delta attribution", () => {
	it("splits a book's pages across the months its progress updates happened, not the completion month", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 400 },
			userId: USER,
		});
		const instanceId = await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-02-10",
		});
		await insertProgressUpdate({
			mediaItemInstanceId: instanceId,
			progressPercentDelta: "50",
			recordedAt: "2024-01-20",
		});
		await insertProgressUpdate({
			mediaItemInstanceId: instanceId,
			progressPercentDelta: "50",
			recordedAt: "2024-02-10",
		});

		const result = await fetchProgressByMonth(
			USER,
			MediaItemType.BOOK,
			START,
			END,
		);

		expect(result.find((r) => r.month === "2024-01")?.value).toBe(200);
		expect(result.find((r) => r.month === "2024-02")?.value).toBe(200);
	});

	it("sums contributions from a re-read in the same month as another instance's progress", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 200 },
			userId: USER,
		});
		const firstReadId = await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-03-01",
		});
		const secondReadId = await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-03-12",
		});
		await insertProgressUpdate({
			mediaItemInstanceId: firstReadId,
			progressPercentDelta: "100",
			recordedAt: "2024-03-01",
		});
		await insertProgressUpdate({
			mediaItemInstanceId: secondReadId,
			progressPercentDelta: "100",
			recordedAt: "2024-03-12",
		});

		const result = await fetchProgressByMonth(
			USER,
			MediaItemType.BOOK,
			START,
			END,
		);

		expect(result.find((r) => r.month === "2024-03")?.value).toBe(400);
	});

	it("floors a month's total at zero when a downward correction makes the net delta negative", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 400 },
			userId: USER,
		});
		const instanceId = await insertInstance({ mediaItemId: itemId });
		await insertProgressUpdate({
			mediaItemInstanceId: instanceId,
			progressPercentDelta: "10",
			recordedAt: "2024-02-01",
		});
		await insertProgressUpdate({
			mediaItemInstanceId: instanceId,
			progressPercentDelta: "-30",
			recordedAt: "2024-02-15",
		});

		const result = await fetchProgressByMonth(
			USER,
			MediaItemType.BOOK,
			START,
			END,
		);

		expect(result.find((r) => r.month === "2024-02")?.value).toBe(0);
	});

	it("excludes progress updates recorded before the cutoff", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 400 },
			userId: USER,
		});
		const instanceId = await insertInstance({ mediaItemId: itemId });
		await insertProgressUpdate({
			mediaItemInstanceId: instanceId,
			progressPercentDelta: "100",
			recordedAt: "2023-11-10",
		});

		const result = await fetchProgressByMonth(
			USER,
			MediaItemType.BOOK,
			START,
			END,
		);
		expect(result.every((r) => r.value === 0)).toBe(true);
	});

	it("excludes progress updates recorded after the cutoff", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 400 },
			userId: USER,
		});
		const instanceId = await insertInstance({ mediaItemId: itemId });
		await insertProgressUpdate({
			mediaItemInstanceId: instanceId,
			progressPercentDelta: "100",
			recordedAt: "2025-01-01",
		});

		const result = await fetchProgressByMonth(
			USER,
			MediaItemType.BOOK,
			START,
			END,
		);
		expect(result.every((r) => r.value === 0)).toBe(true);
	});

	it("includes a progress update recorded on the end-of-range day", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 400 },
			userId: USER,
		});
		const instanceId = await insertInstance({ mediaItemId: itemId });
		await insertProgressUpdate({
			mediaItemInstanceId: instanceId,
			progressPercentDelta: "100",
			recordedAt: "2024-03-15",
		});

		const result = await fetchProgressByMonth(
			USER,
			MediaItemType.BOOK,
			START,
			END,
		);
		expect(result.find((r) => r.month === "2024-03")?.value).toBe(400);
	});

	it("sums multiple items' progress updates within the same month", async () => {
		const itemId1 = await insertMediaItem({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 100 },
			userId: USER,
		});
		const itemId2 = await insertMediaItem({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 50 },
			userId: USER,
		});
		const instanceId1 = await insertInstance({ mediaItemId: itemId1 });
		const instanceId2 = await insertInstance({ mediaItemId: itemId2 });
		await insertProgressUpdate({
			mediaItemInstanceId: instanceId1,
			progressPercentDelta: "100",
			recordedAt: "2024-03-05",
		});
		await insertProgressUpdate({
			mediaItemInstanceId: instanceId2,
			progressPercentDelta: "100",
			recordedAt: "2024-03-10",
		});

		const result = await fetchProgressByMonth(
			USER,
			MediaItemType.BOOK,
			START,
			END,
		);
		expect(result.find((r) => r.month === "2024-03")?.value).toBe(150);
	});

	it("months with no progress updates default to 0", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 400 },
			userId: USER,
		});
		const instanceId = await insertInstance({ mediaItemId: itemId });
		await insertProgressUpdate({
			mediaItemInstanceId: instanceId,
			progressPercentDelta: "100",
			recordedAt: "2024-03-01",
		});

		const result = await fetchProgressByMonth(
			USER,
			MediaItemType.BOOK,
			START,
			END,
		);
		expect(result.find((r) => r.month === "2024-01")?.value).toBe(0);
		expect(result.find((r) => r.month === "2024-02")?.value).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// per-type metrics (smoke tests confirming SQL mirrors computeProgressMetric)
// ---------------------------------------------------------------------------

describe("per-type metrics", () => {
	it("book sums pageCount from the delta", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 300 },
			userId: USER,
		});
		const instanceId = await insertInstance({ mediaItemId: itemId });
		await insertProgressUpdate({
			mediaItemInstanceId: instanceId,
			progressPercentDelta: "100",
			recordedAt: "2024-03-10",
		});

		const result = await fetchProgressByMonth(
			USER,
			MediaItemType.BOOK,
			START,
			END,
		);
		expect(result.find((r) => r.month === "2024-03")?.value).toBe(300);
	});

	it("movie sums runtime / 60 from the delta", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.MOVIE,
			metadata: { runtime: 120 },
			userId: USER,
		});
		const instanceId = await insertInstance({ mediaItemId: itemId });
		await insertProgressUpdate({
			mediaItemInstanceId: instanceId,
			progressPercentDelta: "100",
			recordedAt: "2024-03-10",
		});

		const result = await fetchProgressByMonth(
			USER,
			MediaItemType.MOVIE,
			START,
			END,
		);
		expect(result.find((r) => r.month === "2024-03")?.value).toBe(2);
	});

	it("tv_show sums numberOfEpisodes from the delta", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.TV_SHOW,
			metadata: { numberOfEpisodes: 8 },
			userId: USER,
		});
		const instanceId = await insertInstance({ mediaItemId: itemId });
		await insertProgressUpdate({
			mediaItemInstanceId: instanceId,
			progressPercentDelta: "100",
			recordedAt: "2024-03-10",
		});

		const result = await fetchProgressByMonth(
			USER,
			MediaItemType.TV_SHOW,
			START,
			END,
		);
		expect(result.find((r) => r.month === "2024-03")?.value).toBe(8);
	});

	it("podcast sums totalDuration / 60 from the delta", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.PODCAST,
			metadata: { totalDuration: 180 },
			userId: USER,
		});
		const instanceId = await insertInstance({ mediaItemId: itemId });
		await insertProgressUpdate({
			mediaItemInstanceId: instanceId,
			progressPercentDelta: "100",
			recordedAt: "2024-03-10",
		});

		const result = await fetchProgressByMonth(
			USER,
			MediaItemType.PODCAST,
			START,
			END,
		);
		expect(result.find((r) => r.month === "2024-03")?.value).toBe(3);
	});

	it("video_game sums timeToBeatNormally from the delta", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.VIDEO_GAME,
			metadata: { timeToBeatNormally: 40 },
			userId: USER,
		});
		const instanceId = await insertInstance({ mediaItemId: itemId });
		await insertProgressUpdate({
			mediaItemInstanceId: instanceId,
			progressPercentDelta: "100",
			recordedAt: "2024-03-10",
		});

		const result = await fetchProgressByMonth(
			USER,
			MediaItemType.VIDEO_GAME,
			START,
			END,
		);
		expect(result.find((r) => r.month === "2024-03")?.value).toBe(40);
	});

	it("video_game falls back to timeToBeatHastily when timeToBeatNormally is absent", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.VIDEO_GAME,
			metadata: { timeToBeatHastily: 20 },
			userId: USER,
		});
		const instanceId = await insertInstance({ mediaItemId: itemId });
		await insertProgressUpdate({
			mediaItemInstanceId: instanceId,
			progressPercentDelta: "100",
			recordedAt: "2024-03-10",
		});

		const result = await fetchProgressByMonth(
			USER,
			MediaItemType.VIDEO_GAME,
			START,
			END,
		);
		expect(result.find((r) => r.month === "2024-03")?.value).toBe(20);
	});
});

// ---------------------------------------------------------------------------
// user scoping
// ---------------------------------------------------------------------------

describe("user scoping", () => {
	it("only returns data for the requesting user", async () => {
		const userItemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 200 },
			userId: USER,
		});
		const otherItemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 200 },
			userId: OTHER_USER,
		});
		const userInstanceId = await insertInstance({ mediaItemId: userItemId });
		const otherInstanceId = await insertInstance({ mediaItemId: otherItemId });
		await insertProgressUpdate({
			mediaItemInstanceId: userInstanceId,
			progressPercentDelta: "100",
			recordedAt: "2024-03-10",
		});
		await insertProgressUpdate({
			mediaItemInstanceId: otherInstanceId,
			progressPercentDelta: "100",
			recordedAt: "2024-03-10",
		});

		const userResult = await fetchProgressByMonth(
			USER,
			MediaItemType.BOOK,
			START,
			END,
		);
		const otherResult = await fetchProgressByMonth(
			OTHER_USER,
			MediaItemType.BOOK,
			START,
			END,
		);

		expect(userResult.find((r) => r.month === "2024-03")?.value).toBe(200);
		expect(otherResult.find((r) => r.month === "2024-03")?.value).toBe(200);
	});
});

// ---------------------------------------------------------------------------
// historical backfill (drizzle/0047_backfill_media_item_progress_updates.sql)
// ---------------------------------------------------------------------------

describe("historical backfill", () => {
	async function runBackfillMigration() {
		const migrationSql = readFileSync(
			join(
				process.cwd(),
				"drizzle/0047_backfill_media_item_progress_updates.sql",
			),
			"utf-8",
		);
		await testDb.execute(sql.raw(migrationSql));
	}

	it("attributes a pre-existing completed instance's full metric to its completion month, matching pre-feature behavior", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 400 },
			userId: USER,
		});
		await insertInstance({
			mediaItemId: itemId,
			completedAt: "2024-02-10",
			progressPercent: "100",
		});

		await runBackfillMigration();

		const result = await fetchProgressByMonth(
			USER,
			MediaItemType.BOOK,
			START,
			END,
		);
		expect(result.find((r) => r.month === "2024-02")?.value).toBe(400);
	});

	it("attributes a pre-existing in-progress instance's partial metric to its last-updated month", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 400 },
			userId: USER,
		});
		const instanceId = await insertInstance({
			mediaItemId: itemId,
			startedAt: "2024-02-01",
			progressPercent: "50",
		});
		await testDb.execute(
			sql`UPDATE media_item_instances SET updated_at = '2024-02-15'::timestamp WHERE id = ${instanceId}`,
		);

		await runBackfillMigration();

		const result = await fetchProgressByMonth(
			USER,
			MediaItemType.BOOK,
			START,
			END,
		);
		expect(result.find((r) => r.month === "2024-02")?.value).toBe(200);
	});

	it("backfills nothing for an instance with no recorded progress", async () => {
		const itemId = await insertMediaItem({
			type: MediaItemType.BOOK,
			metadata: { pageCount: 400 },
			userId: USER,
		});
		await insertInstance({ mediaItemId: itemId, startedAt: "2024-02-01" });

		await runBackfillMigration();

		const result = await fetchProgressByMonth(
			USER,
			MediaItemType.BOOK,
			START,
			END,
		);
		expect(result.every((r) => r.value === 0)).toBe(true);
	});
});
