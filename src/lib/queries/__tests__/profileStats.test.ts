import { describe, expect, it } from "vitest";

import { MediaItemStatus } from "#/lib/enums";
import { computeProfileStats } from "#/lib/queries/profileStats";

// ---------------------------------------------------------------------------
// computeProfileStats
// ---------------------------------------------------------------------------

describe("computeProfileStats", () => {
	it("returns zero counts and a null average for an empty item list", () => {
		expect(computeProfileStats([])).toEqual({
			totalCount: 0,
			completedCount: 0,
			averageRating: null,
		});
	});

	it("counts only COMPLETED items as completed and averages only rated items", () => {
		const stats = computeProfileStats([
			{ status: MediaItemStatus.COMPLETED, rating: 4 },
			{ status: MediaItemStatus.COMPLETED, rating: 5 },
			{ status: MediaItemStatus.IN_PROGRESS, rating: 0 },
			{ status: MediaItemStatus.BACKLOG, rating: 0 },
		]);

		expect(stats).toEqual({
			totalCount: 4,
			completedCount: 2,
			averageRating: 4.5,
		});
	});
});
