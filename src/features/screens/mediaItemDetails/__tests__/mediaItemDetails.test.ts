import { describe, expect, it } from "vitest";
import { MediaItemStatus } from "#/lib/enums";
import { inferStatusFromInstances } from "../mediaItemDetails";

describe("inferStatusFromInstances", () => {
	it("returns BACKLOG when there are no instances", () => {
		expect(inferStatusFromInstances([])).toBe(MediaItemStatus.BACKLOG);
	});

	it("returns BACKLOG when the only instance has neither date", () => {
		expect(
			inferStatusFromInstances([{ startedAt: null, completedAt: null }]),
		).toBe(MediaItemStatus.BACKLOG);
	});

	it("returns IN_PROGRESS when an instance has startedAt but no completedAt", () => {
		expect(
			inferStatusFromInstances([
				{ startedAt: "2024-01-01", completedAt: null },
			]),
		).toBe(MediaItemStatus.IN_PROGRESS);
	});

	it("returns COMPLETED when an instance has completedAt", () => {
		expect(
			inferStatusFromInstances([
				{ startedAt: "2024-01-01", completedAt: "2024-01-15" },
			]),
		).toBe(MediaItemStatus.COMPLETED);
	});

	it("returns IN_PROGRESS when instances include both a completed and an in-progress one (in-progress wins)", () => {
		expect(
			inferStatusFromInstances([
				{ startedAt: "2024-01-01", completedAt: "2024-01-15" },
				{ startedAt: "2024-06-01", completedAt: null },
			]),
		).toBe(MediaItemStatus.IN_PROGRESS);
	});

	it("returns COMPLETED when all instances are completed", () => {
		expect(
			inferStatusFromInstances([
				{ startedAt: "2024-01-01", completedAt: "2024-01-15" },
				{ startedAt: "2024-06-01", completedAt: "2024-07-01" },
			]),
		).toBe(MediaItemStatus.COMPLETED);
	});

	it("returns COMPLETED when one instance is empty and another is completed", () => {
		expect(
			inferStatusFromInstances([
				{ startedAt: null, completedAt: null },
				{ startedAt: "2024-01-01", completedAt: "2024-01-15" },
			]),
		).toBe(MediaItemStatus.COMPLETED);
	});

	it("preserves ON_HOLD when an instance is still unfinished", () => {
		expect(
			inferStatusFromInstances(
				[{ startedAt: "2024-01-01", completedAt: null }],
				MediaItemStatus.ON_HOLD,
			),
		).toBe(MediaItemStatus.ON_HOLD);
	});

	it("preserves DROPPED when an instance is still unfinished", () => {
		expect(
			inferStatusFromInstances(
				[{ startedAt: "2024-01-01", completedAt: null }],
				MediaItemStatus.DROPPED,
			),
		).toBe(MediaItemStatus.DROPPED);
	});

	it("still returns COMPLETED for an ON_HOLD item once an instance gets a completedAt date", () => {
		expect(
			inferStatusFromInstances(
				[{ startedAt: "2024-01-01", completedAt: "2024-01-15" }],
				MediaItemStatus.ON_HOLD,
			),
		).toBe(MediaItemStatus.COMPLETED);
	});
});
