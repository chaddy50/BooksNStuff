import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/lib/enums";

// Redirect all db calls to the test database.
vi.mock("#/database/index", async () => {
	const { testDb } = await import("#/tests/integration/db");
	return { db: testDb };
});
vi.mock("#/features/screens/auth", () => ({ auth: {} }));
vi.mock("#/features/screens/auth/session", () => ({
	getLoggedInUser: vi.fn(),
	getRequiredUser: vi.fn(),
}));

import { mediaItems, nextUpItemOrder, user } from "#/database/schema";
import { testDb } from "#/tests/integration/db";
import {
	insertMediaItem,
	insertNextUpItemOrder,
	insertUser,
	truncateAll,
} from "#/tests/integration/helpers";

const USER_A = "test-user-a";
const USER_B = "test-user-b";

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function insertItem(title: string) {
	return insertMediaItem({ userId: USER_A, type: MediaItemType.BOOK, title });
}

async function countAllOrderRows() {
	return (await testDb.select().from(nextUpItemOrder)).length;
}

async function countOrderRowsForUser(userId: string) {
	return (
		await testDb
			.select()
			.from(nextUpItemOrder)
			.where(eq(nextUpItemOrder.userId, userId))
	).length;
}

// ---------------------------------------------------------------------------
// Cascades
// ---------------------------------------------------------------------------

describe("next_up_item_order cascades", () => {
	it("removes a user's order rows when the user is deleted", async () => {
		await insertUser(USER_A);
		const itemId = await insertItem("Gilgamesh");
		await insertNextUpItemOrder({
			userId: USER_A,
			mediaItemId: itemId,
			position: 0,
		});

		await testDb.delete(user).where(eq(user.id, USER_A));

		expect(await countOrderRowsForUser(USER_A)).toBe(0);
	});

	it("removes an item's order rows when the item leaves the library", async () => {
		await insertUser(USER_A);
		const removedId = await insertItem("Removed");
		const keptId = await insertItem("Kept");
		await insertNextUpItemOrder({
			userId: USER_A,
			mediaItemId: removedId,
			position: 0,
		});
		await insertNextUpItemOrder({
			userId: USER_A,
			mediaItemId: keptId,
			position: 1,
		});

		await testDb.delete(mediaItems).where(eq(mediaItems.id, removedId));

		const remaining = await testDb
			.select()
			.from(nextUpItemOrder)
			.where(eq(nextUpItemOrder.userId, USER_A));
		expect(remaining.map((row) => row.mediaItemId)).toEqual([keptId]);
	});
});

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

describe("next_up_item_order constraints", () => {
	it("rejects a duplicate (userId, mediaItemId) pair", async () => {
		await insertUser(USER_A);
		const itemId = await insertItem("Gilgamesh");
		await insertNextUpItemOrder({
			userId: USER_A,
			mediaItemId: itemId,
			position: 0,
		});

		await expect(
			insertNextUpItemOrder({
				userId: USER_A,
				mediaItemId: itemId,
				position: 1,
			}),
		).rejects.toThrow();
	});

	it("lets one media item hold a position for two different users", async () => {
		await insertUser(USER_A);
		await insertUser(USER_B);
		const itemId = await insertItem("Gilgamesh");

		await insertNextUpItemOrder({
			userId: USER_A,
			mediaItemId: itemId,
			position: 0,
		});
		await insertNextUpItemOrder({
			userId: USER_B,
			mediaItemId: itemId,
			position: 3,
		});

		expect(await countAllOrderRows()).toBe(2);
	});

	it("rejects a row pointing at a nonexistent user", async () => {
		const itemId = await insertItem("Gilgamesh");

		await expect(
			insertNextUpItemOrder({
				userId: "nonexistent-user",
				mediaItemId: itemId,
				position: 0,
			}),
		).rejects.toThrow();
	});

	it("rejects a row pointing at a nonexistent media item", async () => {
		await insertUser(USER_A);

		await expect(
			insertNextUpItemOrder({
				userId: USER_A,
				mediaItemId: 999_999,
				position: 0,
			}),
		).rejects.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Fixture guard
// ---------------------------------------------------------------------------

describe("truncateAll", () => {
	it("leaves next_up_item_order empty for the next test", async () => {
		expect(await countAllOrderRows()).toBe(0);
	});
});
