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

vi.mock("#/features/mediaItemSearch/api/hardcover", () => ({
	fetchSeriesBooks: vi.fn(),
}));
vi.mock("#/features/mediaItemSearch/api/tmdb", () => ({
	fetchCollectionMovies: vi.fn(),
}));
vi.mock("#/features/mediaItemSearch/api/igdb", () => ({
	fetchCollectionGames: vi.fn(),
}));

import * as hardcover from "#/features/mediaItemSearch/api/hardcover";
import * as igdb from "#/features/mediaItemSearch/api/igdb";
import * as tmdb from "#/features/mediaItemSearch/api/tmdb";
import type { ExternalSearchResult } from "#/features/mediaItemSearch/api/types";
import { MediaItemType } from "#/lib/enums";
import {
	insertCreator,
	insertMediaItem,
	insertSeries,
	truncateAll,
} from "#/tests/integration/helpers";
import { getMissingSeriesItems } from "../missingSeriesItems.server";

const USER_A = "user-a";
const USER_B = "user-b";
const SERIES_NAME = "Mistborn";

const fetchSeriesBooksMock = vi.mocked(hardcover.fetchSeriesBooks);
const fetchCollectionMoviesMock = vi.mocked(tmdb.fetchCollectionMovies);
const fetchCollectionGamesMock = vi.mocked(igdb.fetchCollectionGames);

function buildCandidate(
	overrides: Partial<ExternalSearchResult> = {},
): ExternalSearchResult {
	return {
		externalId: "101",
		externalSource: "hardcover",
		type: MediaItemType.BOOK,
		title: "The Final Empire",
		metadata: {},
		...overrides,
	};
}

/** Seeds a book series for USER_A whose roster comes back as `candidates`. */
async function seedBookSeries(
	candidates: ExternalSearchResult[],
): Promise<number> {
	const seriesId = await insertSeries({
		userId: USER_A,
		name: SERIES_NAME,
		type: MediaItemType.BOOK,
	});
	fetchSeriesBooksMock.mockResolvedValue(candidates);
	return seriesId;
}

function expectNoFetchersCalled() {
	expect(fetchSeriesBooksMock).not.toHaveBeenCalled();
	expect(fetchCollectionMoviesMock).not.toHaveBeenCalled();
	expect(fetchCollectionGamesMock).not.toHaveBeenCalled();
}

beforeEach(async () => {
	vi.clearAllMocks();
	fetchSeriesBooksMock.mockResolvedValue([]);
	fetchCollectionMoviesMock.mockResolvedValue([]);
	fetchCollectionGamesMock.mockResolvedValue([]);
	await truncateAll();
});

describe("getMissingSeriesItems", () => {
	it("resolves a book series through the Hardcover client", async () => {
		const candidate = buildCandidate();
		const seriesId = await seedBookSeries([candidate]);

		const result = await getMissingSeriesItems(seriesId, USER_A);

		expect(fetchSeriesBooksMock).toHaveBeenCalledExactlyOnceWith(
			SERIES_NAME,
			[],
		);
		expect(result).toEqual([candidate]);
	});

	it("passes the series' known author to the Hardcover client", async () => {
		const creatorId = await insertCreator({
			userId: USER_A,
			name: "Signe Pike",
		});
		const seriesId = await seedBookSeries([buildCandidate()]);
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			seriesId,
			creatorId,
			externalId: "100",
			externalSource: "hardcover",
		});

		await getMissingSeriesItems(seriesId, USER_A);

		expect(fetchSeriesBooksMock).toHaveBeenCalledExactlyOnceWith(SERIES_NAME, [
			"Signe Pike",
		]);
	});

	it("resolves a movie series through the TMDB client", async () => {
		const seriesId = await insertSeries({
			userId: USER_A,
			name: "The Lord of the Rings",
			type: MediaItemType.MOVIE,
		});
		fetchCollectionMoviesMock.mockResolvedValue([
			buildCandidate({ externalSource: "tmdb", type: MediaItemType.MOVIE }),
		]);

		const result = await getMissingSeriesItems(seriesId, USER_A);

		expect(fetchCollectionMoviesMock).toHaveBeenCalledExactlyOnceWith(
			"The Lord of the Rings",
		);
		expect(fetchSeriesBooksMock).not.toHaveBeenCalled();
		expect(fetchCollectionGamesMock).not.toHaveBeenCalled();
		expect(result).toHaveLength(1);
	});

	it("resolves a game series through the IGDB client", async () => {
		const seriesId = await insertSeries({
			userId: USER_A,
			name: "Mass Effect",
			type: MediaItemType.VIDEO_GAME,
		});
		fetchCollectionGamesMock.mockResolvedValue([
			buildCandidate({
				externalSource: "igdb",
				type: MediaItemType.VIDEO_GAME,
			}),
		]);

		const result = await getMissingSeriesItems(seriesId, USER_A);

		expect(fetchCollectionGamesMock).toHaveBeenCalledExactlyOnceWith(
			"Mass Effect",
		);
		expect(fetchSeriesBooksMock).not.toHaveBeenCalled();
		expect(fetchCollectionMoviesMock).not.toHaveBeenCalled();
		expect(result).toHaveLength(1);
	});

	it("returns nothing for a TV show series without calling out", async () => {
		const seriesId = await insertSeries({
			userId: USER_A,
			type: MediaItemType.TV_SHOW,
		});

		expect(await getMissingSeriesItems(seriesId, USER_A)).toEqual([]);
		expectNoFetchersCalled();
	});

	it("returns nothing for a podcast series without calling out", async () => {
		const seriesId = await insertSeries({
			userId: USER_A,
			type: MediaItemType.PODCAST,
		});

		expect(await getMissingSeriesItems(seriesId, USER_A)).toEqual([]);
		expectNoFetchersCalled();
	});

	it("excludes a candidate already owned inside this series", async () => {
		const seriesId = await seedBookSeries([
			buildCandidate({ externalId: "101" }),
			buildCandidate({ externalId: "102", title: "The Well of Ascension" }),
		]);
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			seriesId,
			externalId: "101",
			externalSource: "hardcover",
		});

		const result = await getMissingSeriesItems(seriesId, USER_A);

		expect(result.map((item) => item.externalId)).toEqual(["102"]);
	});

	it("excludes a candidate the user owns elsewhere in their library", async () => {
		const seriesId = await seedBookSeries([
			buildCandidate({ externalId: "101" }),
		]);
		// Left unfiled: the owned-key lookup must span the whole library, not
		// just this series.
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			externalId: "101",
			externalSource: "hardcover",
		});

		expect(await getMissingSeriesItems(seriesId, USER_A)).toEqual([]);
	});

	it("keeps a candidate only another user owns", async () => {
		const seriesId = await seedBookSeries([
			buildCandidate({ externalId: "101" }),
		]);
		await insertMediaItem({
			userId: USER_B,
			type: MediaItemType.BOOK,
			externalId: "101",
			externalSource: "hardcover",
		});

		const result = await getMissingSeriesItems(seriesId, USER_A);

		expect(result.map((item) => item.externalId)).toEqual(["101"]);
	});

	it("keeps a candidate owned under a different external source", async () => {
		const seriesId = await seedBookSeries([
			buildCandidate({ externalId: "101" }),
		]);
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			externalId: "101",
			externalSource: "custom",
		});

		expect(await getMissingSeriesItems(seriesId, USER_A)).toHaveLength(1);
	});

	it("returns nothing for a series owned by another user", async () => {
		const seriesId = await seedBookSeries([buildCandidate()]);

		expect(await getMissingSeriesItems(seriesId, USER_B)).toEqual([]);
		expectNoFetchersCalled();
	});

	it("returns nothing for a series that does not exist", async () => {
		expect(await getMissingSeriesItems(9999, USER_A)).toEqual([]);
		expectNoFetchersCalled();
	});

	it("returns nothing when the external fetcher rejects", async () => {
		const seriesId = await insertSeries({
			userId: USER_A,
			name: SERIES_NAME,
			type: MediaItemType.BOOK,
		});
		fetchSeriesBooksMock.mockRejectedValue(new Error("upstream down"));

		await expect(getMissingSeriesItems(seriesId, USER_A)).resolves.toEqual([]);
	});

	it("returns nothing when the provider knows of no items", async () => {
		const seriesId = await seedBookSeries([]);

		expect(await getMissingSeriesItems(seriesId, USER_A)).toEqual([]);
	});

	it("caps the returned list at 50 items", async () => {
		const candidates = Array.from({ length: 75 }, (_, index) =>
			buildCandidate({
				externalId: String(index),
				metadata: { seriesBookNumber: String(index) },
			}),
		);
		const seriesId = await seedBookSeries(candidates);

		expect(await getMissingSeriesItems(seriesId, USER_A)).toHaveLength(50);
	});

	it("returns the candidates sorted by series book number", async () => {
		const seriesId = await seedBookSeries([
			buildCandidate({
				externalId: "10",
				metadata: { seriesBookNumber: "10" },
			}),
			buildCandidate({ externalId: "1", metadata: { seriesBookNumber: "1" } }),
			buildCandidate({ externalId: "2", metadata: { seriesBookNumber: "2" } }),
		]);

		const result = await getMissingSeriesItems(seriesId, USER_A);

		expect(result.map((item) => item.externalId)).toEqual(["1", "2", "10"]);
	});

	it("drops a candidate whose author doesn't match the series' known author", async () => {
		const creatorId = await insertCreator({
			userId: USER_A,
			name: "Isabelle Schuler",
		});
		const seriesId = await seedBookSeries([
			buildCandidate({
				externalId: "101",
				metadata: { author: "Isabelle Schuler" },
			}),
			buildCandidate({
				externalId: "999",
				title: "An Unrelated Lost Queen",
				metadata: { author: "Isobelle Carmody" },
			}),
		]);
		await insertMediaItem({
			userId: USER_A,
			type: MediaItemType.BOOK,
			seriesId,
			creatorId,
			externalId: "100",
			externalSource: "hardcover",
		});

		const result = await getMissingSeriesItems(seriesId, USER_A);

		expect(result.map((item) => item.externalId)).toEqual(["101"]);
	});

	it("keeps every candidate when the series has no known author yet", async () => {
		const seriesId = await seedBookSeries([
			buildCandidate({
				externalId: "101",
				metadata: { author: "Isabelle Schuler" },
			}),
			buildCandidate({
				externalId: "999",
				metadata: { author: "Isobelle Carmody" },
			}),
		]);

		const result = await getMissingSeriesItems(seriesId, USER_A);

		expect(result.map((item) => item.externalId).sort()).toEqual([
			"101",
			"999",
		]);
	});

	it("de-duplicates a candidate the provider returned twice", async () => {
		const seriesId = await seedBookSeries([
			buildCandidate({ externalId: "101" }),
			buildCandidate({ externalId: "101" }),
		]);

		expect(await getMissingSeriesItems(seriesId, USER_A)).toHaveLength(1);
	});
});
