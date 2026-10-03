import { describe, expect, it } from "vitest";

import type { ExternalSearchResult } from "#/features/mediaItemSearch/api/types";
import {
	filterByKnownCreator,
	filterOutOwnedItems,
	sortMissingItems,
} from "#/features/screens/seriesDetails/missingSeriesItems.server";
import { MediaItemType } from "#/lib/enums";

function buildCandidate(
	overrides: Partial<ExternalSearchResult> = {},
): ExternalSearchResult {
	return {
		externalId: "1",
		externalSource: "tmdb",
		type: MediaItemType.MOVIE,
		title: "Test Title",
		metadata: {},
		...overrides,
	};
}

function buildNumberedCandidate(
	seriesBookNumber: string | undefined,
	overrides: Partial<ExternalSearchResult> = {},
): ExternalSearchResult {
	return buildCandidate({
		externalId: seriesBookNumber ?? "none",
		title: seriesBookNumber ?? "unnumbered",
		metadata: seriesBookNumber === undefined ? {} : { seriesBookNumber },
		...overrides,
	});
}

describe("filterOutOwnedItems", () => {
	it("drops candidates whose key is owned", () => {
		const owned = buildCandidate({ externalId: "42", externalSource: "tmdb" });
		const unowned = buildCandidate({
			externalId: "43",
			externalSource: "tmdb",
		});

		const result = filterOutOwnedItems([owned, unowned], new Set(["42:tmdb"]));

		expect(result).toEqual([unowned]);
	});

	it("keeps a candidate sharing an externalId with a different source", () => {
		const differentSource = buildCandidate({
			externalId: "42",
			externalSource: "igdb",
		});

		const result = filterOutOwnedItems([differentSource], new Set(["42:tmdb"]));

		expect(result).toEqual([differentSource]);
	});

	it("de-duplicates repeated keys, keeping the first occurrence", () => {
		const first = buildCandidate({ externalId: "7", title: "First" });
		const duplicate = buildCandidate({ externalId: "7", title: "Duplicate" });

		const result = filterOutOwnedItems([first, duplicate], new Set());

		expect(result).toEqual([first]);
	});

	it("preserves the order of the surviving candidates", () => {
		const candidates = ["1", "2", "3", "4"].map((externalId) =>
			buildCandidate({ externalId }),
		);

		const result = filterOutOwnedItems(candidates, new Set(["2:tmdb"]));

		expect(result.map((candidate) => candidate.externalId)).toEqual([
			"1",
			"3",
			"4",
		]);
	});

	it("returns every candidate when nothing is owned", () => {
		const candidates = ["1", "2"].map((externalId) =>
			buildCandidate({ externalId }),
		);

		expect(filterOutOwnedItems(candidates, new Set())).toHaveLength(2);
	});

	it("returns an empty list for no candidates", () => {
		expect(filterOutOwnedItems([], new Set(["1:tmdb"]))).toEqual([]);
	});
});

describe("filterByKnownCreator", () => {
	it("drops a candidate whose resolved creator isn't in the known set", () => {
		const wrongAuthor = buildCandidate({
			type: MediaItemType.BOOK,
			metadata: { author: "Isobelle Carmody" },
		});

		const result = filterByKnownCreator(
			[wrongAuthor],
			MediaItemType.BOOK,
			new Set(["isabelle schuler"]),
		);

		expect(result).toEqual([]);
	});

	it("keeps a candidate whose resolved creator matches, case-insensitively", () => {
		const matchingAuthor = buildCandidate({
			type: MediaItemType.BOOK,
			metadata: { author: "Isabelle Schuler" },
		});

		const result = filterByKnownCreator(
			[matchingAuthor],
			MediaItemType.BOOK,
			new Set(["isabelle schuler"]),
		);

		expect(result).toEqual([matchingAuthor]);
	});

	it("returns every candidate unchanged when no creators are known yet", () => {
		const candidates = [
			buildCandidate({
				type: MediaItemType.BOOK,
				metadata: { author: "Anyone" },
			}),
		];

		const result = filterByKnownCreator(
			candidates,
			MediaItemType.BOOK,
			new Set(),
		);

		expect(result).toEqual(candidates);
	});

	it("keeps a candidate with no resolvable creator name", () => {
		const noAuthor = buildCandidate({ type: MediaItemType.BOOK, metadata: {} });

		const result = filterByKnownCreator(
			[noAuthor],
			MediaItemType.BOOK,
			new Set(["isabelle schuler"]),
		);

		expect(result).toEqual([noAuthor]);
	});

	it("resolves the creator key per media type rather than always reading author", () => {
		const wrongDirector = buildCandidate({
			type: MediaItemType.MOVIE,
			metadata: { director: "Someone Else" },
		});

		const result = filterByKnownCreator(
			[wrongDirector],
			MediaItemType.MOVIE,
			new Set(["peter jackson"]),
		);

		expect(result).toEqual([]);
	});
});

describe("sortMissingItems", () => {
	it("orders by series book number numerically rather than lexicographically", () => {
		const result = sortMissingItems([
			buildNumberedCandidate("10"),
			buildNumberedCandidate("2"),
		]);

		expect(result.map((item) => item.metadata.seriesBookNumber)).toEqual([
			"2",
			"10",
		]);
	});

	it("slots a decimal book number between the integers around it", () => {
		const result = sortMissingItems([
			buildNumberedCandidate("2"),
			buildNumberedCandidate("1.5"),
			buildNumberedCandidate("1"),
		]);

		expect(result.map((item) => item.metadata.seriesBookNumber)).toEqual([
			"1",
			"1.5",
			"2",
		]);
	});

	it("sorts an item with no series book number last", () => {
		const result = sortMissingItems([
			buildNumberedCandidate(undefined),
			buildNumberedCandidate("1"),
		]);

		expect(result.map((item) => item.title)).toEqual(["1", "unnumbered"]);
	});

	it("sorts a non-numeric series book number last", () => {
		const result = sortMissingItems([
			buildNumberedCandidate("Prequel"),
			buildNumberedCandidate("1"),
			buildNumberedCandidate("2"),
		]);

		expect(result.map((item) => item.title)).toEqual(["1", "2", "Prequel"]);
	});

	it("falls back to release date when book numbers tie", () => {
		const older = buildCandidate({
			externalId: "older",
			releaseDate: "1999-01-01",
		});
		const newer = buildCandidate({
			externalId: "newer",
			releaseDate: "2005-01-01",
		});

		const result = sortMissingItems([newer, older]);

		expect(result.map((item) => item.externalId)).toEqual(["older", "newer"]);
	});

	it("does not mutate the array it was given", () => {
		const candidates = [
			buildNumberedCandidate("2"),
			buildNumberedCandidate("1"),
		];

		sortMissingItems(candidates);

		expect(candidates.map((item) => item.metadata.seriesBookNumber)).toEqual([
			"2",
			"1",
		]);
	});
});
