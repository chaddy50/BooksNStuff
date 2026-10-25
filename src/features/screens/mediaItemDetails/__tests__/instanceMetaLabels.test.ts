import { describe, expect, it } from "vitest";
import {
	getDateSegment,
	getInstanceMetaLabels,
} from "#/features/screens/mediaItemDetails/instanceMetaLabels";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemStatus } from "#/lib/enums";

type Instance = MediaItemDetails["instances"][number];

const baseInstance: Instance = {
	id: 1,
	rating: 0,
	fictionRating: null,
	seasonReviews: null,
	consumptionInfo: null,
	reviewText: null,
	progressPercent: null,
	startedAt: "2026-01-01",
	completedAt: null,
};

const t = (key: string, options?: Record<string, unknown>) =>
	options ? `${key}:${JSON.stringify(options)}` : key;

describe("getDateSegment", () => {
	it("returns the started/completed date range when not on hold", () => {
		expect(
			getDateSegment(MediaItemStatus.IN_PROGRESS, null, baseInstance, t),
		).toBe("Started Jan 01, 2026");
	});

	it("returns an On Hold since label when on hold with a known statusChangedAt", () => {
		expect(
			getDateSegment(MediaItemStatus.ON_HOLD, "2026-02-10", baseInstance, t),
		).toBe('mediaItemDetails.onHoldSince:{"date":"Feb 10, 2026"}');
	});

	it("returns null when on hold with an unknown statusChangedAt", () => {
		expect(
			getDateSegment(MediaItemStatus.ON_HOLD, null, baseInstance, t),
		).toBeNull();
	});

	it("returns a Dropped on label when dropped with a known statusChangedAt", () => {
		expect(
			getDateSegment(MediaItemStatus.DROPPED, "2026-03-05", baseInstance, t),
		).toBe('mediaItemDetails.droppedOn:{"date":"Mar 05, 2026"}');
	});

	it("returns null when dropped with an unknown statusChangedAt", () => {
		expect(
			getDateSegment(MediaItemStatus.DROPPED, null, baseInstance, t),
		).toBeNull();
	});
});

describe("getInstanceMetaLabels", () => {
	it("combines the date segment, consumption label, and progress label", () => {
		const labels = getInstanceMetaLabels(
			{
				...baseInstance,
				progressPercent: 42,
				consumptionInfo: { method: "ebook" },
			},
			MediaItemStatus.IN_PROGRESS,
			null,
			t,
		);

		expect(labels).toEqual([
			"Started Jan 01, 2026",
			"consumption.method.ebook",
			'mediaItemDetails.progressComplete:{"percent":42}',
		]);
	});

	it("combines a Dropped on date with the frozen progress percentage", () => {
		const labels = getInstanceMetaLabels(
			{ ...baseInstance, progressPercent: 50 },
			MediaItemStatus.DROPPED,
			"2026-03-05",
			t,
		);

		expect(labels).toEqual([
			'mediaItemDetails.droppedOn:{"date":"Mar 05, 2026"}',
			'mediaItemDetails.progressComplete:{"percent":50}',
		]);
	});

	it("omits a null date segment while on hold with an unknown statusChangedAt", () => {
		const labels = getInstanceMetaLabels(
			baseInstance,
			MediaItemStatus.ON_HOLD,
			null,
			t,
		);

		expect(labels).toEqual([]);
	});
});
