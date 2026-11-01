import { describe, expect, it } from "vitest";

import { MediaItemStatus } from "#/lib/enums";
import { inferSeriesStatus } from "#/lib/queries/seriesStatus";

// ---------------------------------------------------------------------------
// inferSeriesStatus
// ---------------------------------------------------------------------------

describe("inferSeriesStatus", () => {
	it("returns null for an empty statuses array", () => {
		expect(inferSeriesStatus([])).toBeNull();
	});

	it("returns IN_PROGRESS when any item is in progress", () => {
		expect(
			inferSeriesStatus([
				MediaItemStatus.IN_PROGRESS,
				MediaItemStatus.COMPLETED,
				MediaItemStatus.BACKLOG,
			]),
		).toBe(MediaItemStatus.IN_PROGRESS);
	});

	it("IN_PROGRESS takes priority over all other conditions", () => {
		// Even if all others are done, an in-progress item wins
		expect(
			inferSeriesStatus([
				MediaItemStatus.IN_PROGRESS,
				MediaItemStatus.COMPLETED,
				MediaItemStatus.DROPPED,
			]),
		).toBe(MediaItemStatus.IN_PROGRESS);
	});

	it("returns COMPLETED when every item is COMPLETED", () => {
		expect(
			inferSeriesStatus([MediaItemStatus.COMPLETED, MediaItemStatus.COMPLETED]),
		).toBe(MediaItemStatus.COMPLETED);
	});

	it("returns DROPPED when every item is DROPPED", () => {
		expect(
			inferSeriesStatus([MediaItemStatus.DROPPED, MediaItemStatus.DROPPED]),
		).toBe(MediaItemStatus.DROPPED);
	});

	it("returns DROPPED when remaining items are all DROPPED (some completed, rest dropped)", () => {
		expect(
			inferSeriesStatus([
				MediaItemStatus.COMPLETED,
				MediaItemStatus.DROPPED,
				MediaItemStatus.DROPPED,
			]),
		).toBe(MediaItemStatus.DROPPED);
	});

	it("returns WAITING_FOR_NEXT_RELEASE when all non-done items are waiting", () => {
		expect(
			inferSeriesStatus([
				MediaItemStatus.COMPLETED,
				MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
				MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
			]),
		).toBe(MediaItemStatus.WAITING_FOR_NEXT_RELEASE);
	});

	it("returns IN_PROGRESS when some items are done and remaining items are BACKLOG", () => {
		expect(
			inferSeriesStatus([MediaItemStatus.COMPLETED, MediaItemStatus.BACKLOG]),
		).toBe(MediaItemStatus.IN_PROGRESS);
	});

	it("returns ON_HOLD when any item is ON_HOLD and none are IN_PROGRESS", () => {
		expect(
			inferSeriesStatus([MediaItemStatus.ON_HOLD, MediaItemStatus.BACKLOG]),
		).toBe(MediaItemStatus.ON_HOLD);
	});

	it("returns ON_HOLD when completed items exist alongside an ON_HOLD item", () => {
		expect(
			inferSeriesStatus([MediaItemStatus.COMPLETED, MediaItemStatus.ON_HOLD]),
		).toBe(MediaItemStatus.ON_HOLD);
	});

	it("returns ON_HOLD when series has done items, an ON_HOLD item, and remaining BACKLOG items", () => {
		expect(
			inferSeriesStatus([
				MediaItemStatus.COMPLETED,
				MediaItemStatus.ON_HOLD,
				MediaItemStatus.BACKLOG,
			]),
		).toBe(MediaItemStatus.ON_HOLD);
	});

	it("returns IN_PROGRESS when any item is IN_PROGRESS even if another is ON_HOLD", () => {
		expect(
			inferSeriesStatus([MediaItemStatus.IN_PROGRESS, MediaItemStatus.ON_HOLD]),
		).toBe(MediaItemStatus.IN_PROGRESS);
	});

	it("returns null when all items are BACKLOG and no items are done yet", () => {
		expect(
			inferSeriesStatus([MediaItemStatus.BACKLOG, MediaItemStatus.BACKLOG]),
		).toBeNull();
	});

	it("preserves a currently ON_HOLD series instead of inferring IN_PROGRESS from done+BACKLOG items", () => {
		expect(
			inferSeriesStatus(
				[MediaItemStatus.COMPLETED, MediaItemStatus.BACKLOG],
				MediaItemStatus.ON_HOLD,
			),
		).toBe(MediaItemStatus.ON_HOLD);
	});

	it("preserves a currently WAITING_FOR_NEXT_RELEASE series instead of inferring IN_PROGRESS from done+BACKLOG items", () => {
		expect(
			inferSeriesStatus(
				[MediaItemStatus.COMPLETED, MediaItemStatus.BACKLOG],
				MediaItemStatus.WAITING_FOR_NEXT_RELEASE,
			),
		).toBe(MediaItemStatus.WAITING_FOR_NEXT_RELEASE);
	});

	it("still returns IN_PROGRESS from done+BACKLOG items when the series isn't currently paused", () => {
		expect(
			inferSeriesStatus(
				[MediaItemStatus.COMPLETED, MediaItemStatus.BACKLOG],
				MediaItemStatus.BACKLOG,
			),
		).toBe(MediaItemStatus.IN_PROGRESS);
	});

	it("still lets a genuinely IN_PROGRESS item override a currently ON_HOLD series", () => {
		expect(
			inferSeriesStatus(
				[MediaItemStatus.IN_PROGRESS, MediaItemStatus.COMPLETED],
				MediaItemStatus.ON_HOLD,
			),
		).toBe(MediaItemStatus.IN_PROGRESS);
	});
});
