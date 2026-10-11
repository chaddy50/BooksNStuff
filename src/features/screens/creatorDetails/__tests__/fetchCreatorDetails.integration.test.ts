import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("#/database/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/features/screens/auth", () => ({ auth: {} }));

import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import {
	insertCreator,
	insertInstance,
	insertMediaItem,
	truncateAll,
} from "#/tests/integration/helpers";
import { fetchCreatorDetails } from "../creatorDetails.server";

const USER_A = "user-a";
const USER_B = "user-b";

beforeEach(() => truncateAll());

describe("fetchCreatorDetails", () => {
	it("returns the creator's own items with their descriptive data", async () => {
		const creatorId = await insertCreator({ userId: USER_A, name: "Author" });
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Dune",
			coverImageUrl: "http://example.test/a.jpg",
			creatorId,
		});

		const details = await fetchCreatorDetails(creatorId, USER_A);

		expect(details.name).toBe("Author");
		expect(details.items).toHaveLength(1);
		expect(details.items[0]).toMatchObject({
			title: "Dune",
			coverImageUrl: "http://example.test/a.jpg",
		});
	});

	it("excludes another user's items", async () => {
		const creatorId = await insertCreator({ userId: USER_A, name: "Author" });
		const otherCreatorId = await insertCreator({
			userId: USER_B,
			name: "Author",
		});
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			title: "Mine",
			creatorId,
		});
		await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.BOOK,
			title: "Theirs",
			creatorId: otherCreatorId,
		});

		const details = await fetchCreatorDetails(creatorId, USER_A);

		expect(details.items.map((item) => item.title)).toEqual(["Mine"]);
	});

	it("includes stats computed from the creator's items and a derived role", async () => {
		const creatorId = await insertCreator({ userId: USER_A, name: "Author" });
		const completedId = await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			status: MediaItemStatus.COMPLETED,
			creatorId,
		});
		await insertInstance({
			mediaItemId: completedId,
			completedAt: "2024-01-01",
			rating: "4",
		});
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			status: MediaItemStatus.BACKLOG,
			creatorId,
		});

		const details = await fetchCreatorDetails(creatorId, USER_A);

		expect(details.stats).toEqual({
			totalCount: 2,
			completedCount: 1,
			averageRating: 4,
		});
		expect(details.role).toBe("author");
	});

	it("returns zero stats and a null role for a creator with no items", async () => {
		const creatorId = await insertCreator({ userId: USER_A, name: "Author" });

		const details = await fetchCreatorDetails(creatorId, USER_A);

		expect(details.stats).toEqual({
			totalCount: 0,
			completedCount: 0,
			averageRating: null,
		});
		expect(details.role).toBeNull();
	});
});
