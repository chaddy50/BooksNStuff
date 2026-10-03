import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { MediaItemType } from "#/lib/enums";
import {
	insertMediaItem,
	insertMediaItemRelation,
	truncateAll,
} from "#/tests/integration/helpers";
import {
	addRelatedMediaItem,
	getRelatedMediaItems,
	removeRelatedMediaItem,
	searchLibraryForRelatedItems,
} from "../relatedItems.server";

const USER_A = "user-a";
const USER_B = "user-b";

beforeEach(() => truncateAll());

async function insertItem(
	userId: string,
	title: string,
	type: MediaItemType = MediaItemType.BOOK,
) {
	return insertMediaItem({ userId, type, title });
}

describe("getRelatedMediaItems", () => {
	it("returns the other item in the pair when the viewed item is stored as mediaItemIdA", async () => {
		const book = await insertItem(USER_A, "Dune");
		const movie = await insertItem(
			USER_A,
			"Dune (1984 film)",
			MediaItemType.MOVIE,
		);
		await insertMediaItemRelation({ mediaItemIdA: book, mediaItemIdB: movie });

		const related = await getRelatedMediaItems(book, USER_A);

		expect(related.map((item) => item.id)).toEqual([movie]);
	});

	it("returns the other item in the pair when the viewed item is stored as mediaItemIdB", async () => {
		const book = await insertItem(USER_A, "Dune");
		const movie = await insertItem(
			USER_A,
			"Dune (1984 film)",
			MediaItemType.MOVIE,
		);
		await insertMediaItemRelation({ mediaItemIdA: book, mediaItemIdB: movie });

		const related = await getRelatedMediaItems(movie, USER_A);

		expect(related.map((item) => item.id)).toEqual([book]);
	});

	it("never returns another user's item even if ids happen to collide", async () => {
		const myItem = await insertItem(USER_A, "Dune");
		const theirItem = await insertItem(USER_B, "Someone Else's Item");
		await insertMediaItemRelation({
			mediaItemIdA: myItem,
			mediaItemIdB: theirItem,
		});

		const related = await getRelatedMediaItems(myItem, USER_A);

		expect(related).toEqual([]);
	});
});

describe("searchLibraryForRelatedItems", () => {
	it("matches a case-insensitive title substring", async () => {
		const dune = await insertItem(USER_A, "Dune");
		const viewer = await insertItem(USER_A, "The Current Item");

		const results = await searchLibraryForRelatedItems("dun", viewer, USER_A);

		expect(results.map((item) => item.id)).toEqual([dune]);
	});

	it("excludes the item being viewed", async () => {
		const viewer = await insertItem(USER_A, "Dune");

		const results = await searchLibraryForRelatedItems("Dune", viewer, USER_A);

		expect(results).toEqual([]);
	});

	it("excludes an item already related to the one being viewed", async () => {
		const viewer = await insertItem(USER_A, "Dune");
		const movie = await insertItem(
			USER_A,
			"Dune (1984 film)",
			MediaItemType.MOVIE,
		);
		await insertMediaItemRelation({
			mediaItemIdA: viewer,
			mediaItemIdB: movie,
		});

		const results = await searchLibraryForRelatedItems("Dune", viewer, USER_A);

		expect(results).toEqual([]);
	});

	it("never matches another user's item", async () => {
		const viewer = await insertItem(USER_A, "The Current Item");
		await insertItem(USER_B, "Dune");

		const results = await searchLibraryForRelatedItems("Dune", viewer, USER_A);

		expect(results).toEqual([]);
	});

	it("returns nothing for a blank query without touching the database", async () => {
		const viewer = await insertItem(USER_A, "The Current Item");
		await insertItem(USER_A, "Dune");

		const results = await searchLibraryForRelatedItems("", viewer, USER_A);

		expect(results).toEqual([]);
	});
});

describe("addRelatedMediaItem", () => {
	it("links two items such that each appears in the other's related items", async () => {
		const book = await insertItem(USER_A, "Dune");
		const movie = await insertItem(
			USER_A,
			"Dune (1984 film)",
			MediaItemType.MOVIE,
		);

		await addRelatedMediaItem(book, movie, USER_A);

		expect((await getRelatedMediaItems(book, USER_A)).map((i) => i.id)).toEqual(
			[movie],
		);
		expect(
			(await getRelatedMediaItems(movie, USER_A)).map((i) => i.id),
		).toEqual([book]);
	});

	it("links the pair regardless of which id is numerically smaller", async () => {
		const book = await insertItem(USER_A, "Dune");
		const movie = await insertItem(
			USER_A,
			"Dune (1984 film)",
			MediaItemType.MOVIE,
		);

		// Pass the larger id first to exercise the ordering normalization.
		await addRelatedMediaItem(
			Math.max(book, movie),
			Math.min(book, movie),
			USER_A,
		);

		expect((await getRelatedMediaItems(book, USER_A)).map((i) => i.id)).toEqual(
			[movie],
		);
	});

	it("does not throw or duplicate the link when the same pair is added twice", async () => {
		const book = await insertItem(USER_A, "Dune");
		const movie = await insertItem(
			USER_A,
			"Dune (1984 film)",
			MediaItemType.MOVIE,
		);

		await addRelatedMediaItem(book, movie, USER_A);
		await addRelatedMediaItem(book, movie, USER_A);

		expect((await getRelatedMediaItems(book, USER_A)).map((i) => i.id)).toEqual(
			[movie],
		);
	});

	it("throws when linking an item owned by a different user", async () => {
		const myItem = await insertItem(USER_A, "Dune");
		const theirItem = await insertItem(USER_B, "Someone Else's Item");

		await expect(
			addRelatedMediaItem(myItem, theirItem, USER_A),
		).rejects.toThrow();
	});

	it("throws when linking an item to itself", async () => {
		const item = await insertItem(USER_A, "Dune");

		await expect(addRelatedMediaItem(item, item, USER_A)).rejects.toThrow();
	});
});

describe("removeRelatedMediaItem", () => {
	it("removes the link so neither item lists the other anymore", async () => {
		const book = await insertItem(USER_A, "Dune");
		const movie = await insertItem(
			USER_A,
			"Dune (1984 film)",
			MediaItemType.MOVIE,
		);
		await insertMediaItemRelation({ mediaItemIdA: book, mediaItemIdB: movie });

		await removeRelatedMediaItem(book, movie, USER_A);

		expect(await getRelatedMediaItems(book, USER_A)).toEqual([]);
		expect(await getRelatedMediaItems(movie, USER_A)).toEqual([]);
	});

	it("removes the link when called with ids in the opposite order from how it was stored", async () => {
		const book = await insertItem(USER_A, "Dune");
		const movie = await insertItem(
			USER_A,
			"Dune (1984 film)",
			MediaItemType.MOVIE,
		);
		await insertMediaItemRelation({ mediaItemIdA: book, mediaItemIdB: movie });

		await removeRelatedMediaItem(movie, book, USER_A);

		expect(await getRelatedMediaItems(book, USER_A)).toEqual([]);
	});

	it("throws when the viewed item is not owned by the requesting user", async () => {
		const theirItem = await insertItem(USER_B, "Dune");
		const anyOtherItem = await insertItem(
			USER_B,
			"Dune (1984 film)",
			MediaItemType.MOVIE,
		);
		await insertMediaItemRelation({
			mediaItemIdA: theirItem,
			mediaItemIdB: anyOtherItem,
		});

		await expect(
			removeRelatedMediaItem(theirItem, anyOtherItem, USER_A),
		).rejects.toThrow();
	});
});
