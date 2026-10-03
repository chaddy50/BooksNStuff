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

import { eq } from "drizzle-orm";
import { mediaItemRelations, mediaItems } from "#/database/schema";
import { testDb } from "#/tests/integration/db";
import {
	insertMediaItem,
	insertMediaItemRelation,
	truncateAll,
} from "#/tests/integration/helpers";

const USER = "test-user";

beforeEach(() => truncateAll());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function insertItem(title: string) {
	return insertMediaItem({ userId: USER, type: MediaItemType.BOOK, title });
}

async function countAllRelationRows() {
	return (await testDb.select().from(mediaItemRelations)).length;
}

// ---------------------------------------------------------------------------
// Cascades
// ---------------------------------------------------------------------------

describe("media_item_relations cascades", () => {
	it("removes the relation when the item stored as mediaItemIdA is deleted", async () => {
		const itemA = await insertItem("Dune");
		const itemB = await insertItem("Dune (1984 film)");
		await insertMediaItemRelation({ mediaItemIdA: itemA, mediaItemIdB: itemB });

		await testDb.delete(mediaItems).where(eq(mediaItems.id, itemA));

		expect(await countAllRelationRows()).toBe(0);
	});

	it("removes the relation when the item stored as mediaItemIdB is deleted", async () => {
		const itemA = await insertItem("Dune");
		const itemB = await insertItem("Dune (1984 film)");
		await insertMediaItemRelation({ mediaItemIdA: itemA, mediaItemIdB: itemB });

		await testDb.delete(mediaItems).where(eq(mediaItems.id, itemB));

		expect(await countAllRelationRows()).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

describe("media_item_relations constraints", () => {
	it("rejects a duplicate (mediaItemIdA, mediaItemIdB) pair", async () => {
		const itemA = await insertItem("Dune");
		const itemB = await insertItem("Dune (1984 film)");
		await insertMediaItemRelation({ mediaItemIdA: itemA, mediaItemIdB: itemB });

		await expect(
			insertMediaItemRelation({ mediaItemIdA: itemA, mediaItemIdB: itemB }),
		).rejects.toThrow();
	});

	it("rejects a row pointing at a nonexistent media item", async () => {
		const itemA = await insertItem("Dune");

		await expect(
			insertMediaItemRelation({ mediaItemIdA: itemA, mediaItemIdB: 999_999 }),
		).rejects.toThrow();
	});
});

// ---------------------------------------------------------------------------
// Fixture guard
// ---------------------------------------------------------------------------

describe("truncateAll", () => {
	it("leaves media_item_relations empty for the next test", async () => {
		expect(await countAllRelationRows()).toBe(0);
	});
});
