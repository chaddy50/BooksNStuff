import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExternalSearchResult } from "#/features/mediaItemSearch/api/types";
import { MediaItemType } from "#/lib/enums";

type SearchHitDocument = {
	id: string;
	title: string;
	release_year?: number;
};

function mockGraphqlResponse(data: unknown) {
	return { status: 200, ok: true, json: async () => ({ data }) };
}

/**
 * The Hardcover client reads its API key at module load and issues two calls
 * (keyword search, then cover images), so each run needs a fresh module.
 */
async function searchWithHit(
	document: SearchHitDocument,
): Promise<ExternalSearchResult[]> {
	vi.stubEnv("HARDCOVER_API_KEY", "Bearer test-key");
	vi.stubGlobal(
		"fetch",
		vi
			.fn()
			.mockResolvedValueOnce(
				mockGraphqlResponse({ search: { results: { hits: [{ document }] } } }),
			)
			.mockResolvedValueOnce(mockGraphqlResponse({ books: [] })),
	);

	vi.resetModules();
	const hardcover = await import("#/features/mediaItemSearch/api/hardcover");
	return hardcover.search("gilgamesh");
}

type SeriesBookEntryDocument = {
	position: number | null;
	book: Record<string, unknown> | null;
};

/** Drives fetchSeriesBooks against a single stubbed GraphQL response. */
async function fetchSeriesBooksWith(
	response: unknown,
	{
		hasApiKey = true,
		knownAuthorNames = [],
	}: { hasApiKey?: boolean; knownAuthorNames?: string[] } = {},
): Promise<{
	results: ExternalSearchResult[];
	fetchMock: ReturnType<typeof vi.fn>;
}> {
	if (hasApiKey) {
		vi.stubEnv("HARDCOVER_API_KEY", "Bearer test-key");
	} else {
		vi.stubEnv("HARDCOVER_API_KEY", "");
	}

	const fetchMock = vi.fn().mockResolvedValue(response);
	vi.stubGlobal("fetch", fetchMock);

	vi.resetModules();
	const hardcover = await import("#/features/mediaItemSearch/api/hardcover");
	const results = await hardcover.fetchSeriesBooks(
		"Mistborn",
		knownAuthorNames,
	);
	return { results, fetchMock };
}

function seriesBooksResponse(entries: SeriesBookEntryDocument[]) {
	return mockGraphqlResponse({ series: [{ book_series: entries }] });
}

const BOOK_DOCUMENT = {
	id: 101,
	title: "The Final Empire",
	description: "A thief tries to overthrow an immortal god-king.",
	pages: 541,
	release_year: 2006,
	image: { url: "assets.hardcover.app/final-empire.jpg" },
	contributions: [{ author: { name: "Brandon Sanderson" } }],
};

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("hardcover.search", () => {
	it("converts a pre-0 CE release year into a storable date", async () => {
		const [result] = await searchWithHit({
			id: "785115",
			title: "The Epic of Gilgamesh",
			release_year: -1200,
		});

		expect(result?.releaseDate).toBe("1200-01-01 BC");
	});

	it("converts a CE release year into a plain date", async () => {
		const [result] = await searchWithHit({
			id: "551643",
			title: "The Iliad",
			release_year: 2020,
		});

		expect(result?.releaseDate).toBe("2020-01-01");
	});

	it("leaves the release date unset when the year is missing", async () => {
		const [result] = await searchWithHit({
			id: "1770381",
			title: "The Iliad:",
		});

		expect(result?.releaseDate).toBeUndefined();
	});
});

describe("hardcover.fetchSeriesBooks", () => {
	it("returns one result per book in the series", async () => {
		const { results } = await fetchSeriesBooksWith(
			seriesBooksResponse([
				{ position: 1, book: BOOK_DOCUMENT },
				{ position: 2, book: { ...BOOK_DOCUMENT, id: 102, title: "The Well" } },
			]),
		);

		expect(results).toHaveLength(2);
		expect(results[0]).toMatchObject({
			externalId: "101",
			externalSource: "hardcover",
			type: MediaItemType.BOOK,
			title: "The Final Empire",
		});
		expect(results[1]?.externalId).toBe("102");
	});

	it("keeps only the confirmed-English edition when one shares a position with an unlabeled one", async () => {
		const { results } = await fetchSeriesBooksWith(
			seriesBooksResponse([
				{
					position: 1,
					book: {
						...BOOK_DOCUMENT,
						id: 101,
						title: "The Final Empire",
						default_physical_edition: { language_id: 1 },
					},
				},
				{
					position: 1,
					book: {
						...BOOK_DOCUMENT,
						id: 999,
						title: "El Imperio Final",
						default_physical_edition: { language_id: null },
					},
				},
			]),
		);

		expect(results.map((result) => result.externalId)).toEqual(["101"]);
	});

	it("keeps every edition at a position when none is confirmed English", async () => {
		const { results } = await fetchSeriesBooksWith(
			seriesBooksResponse([
				{
					position: 1,
					book: {
						...BOOK_DOCUMENT,
						id: 101,
						default_physical_edition: { language_id: null },
					},
				},
				{
					position: 1,
					book: {
						...BOOK_DOCUMENT,
						id: 102,
						title: "El Imperio Final",
						default_physical_edition: null,
					},
				},
			]),
		);

		expect(results.map((result) => result.externalId).sort()).toEqual([
			"101",
			"102",
		]);
	});

	it("never lets an unpositioned book cause an unrelated one to be dropped", async () => {
		const { results } = await fetchSeriesBooksWith(
			seriesBooksResponse([
				{
					position: null,
					book: {
						...BOOK_DOCUMENT,
						id: 101,
						default_physical_edition: { language_id: 1 },
					},
				},
				{
					position: null,
					book: {
						...BOOK_DOCUMENT,
						id: 102,
						title: "El Imperio Final",
						default_physical_edition: { language_id: null },
					},
				},
			]),
		);

		expect(results.map((result) => result.externalId).sort()).toEqual([
			"101",
			"102",
		]);
	});

	it("turns a protocol-relative cover into an https URL", async () => {
		const { results } = await fetchSeriesBooksWith(
			seriesBooksResponse([{ position: 1, book: BOOK_DOCUMENT }]),
		);

		expect(results[0]?.coverImageUrl).toBe(
			"https://assets.hardcover.app/final-empire.jpg",
		);
	});

	it("leaves an already-absolute cover URL unchanged", async () => {
		const { results } = await fetchSeriesBooksWith(
			seriesBooksResponse([
				{
					position: 1,
					book: { ...BOOK_DOCUMENT, image: { url: "https://cdn/x.jpg" } },
				},
			]),
		);

		expect(results[0]?.coverImageUrl).toBe("https://cdn/x.jpg");
	});

	it("leaves the cover unset when the book has no image", async () => {
		const { results } = await fetchSeriesBooksWith(
			seriesBooksResponse([
				{ position: 1, book: { ...BOOK_DOCUMENT, image: null } },
			]),
		);

		expect(results[0]?.coverImageUrl).toBeUndefined();
	});

	it("routes the release year through releaseYearToDate", async () => {
		const { results } = await fetchSeriesBooksWith(
			seriesBooksResponse([
				{ position: 1, book: { ...BOOK_DOCUMENT, release_year: -1200 } },
				{
					position: 2,
					book: { ...BOOK_DOCUMENT, id: 102, release_year: 2020 },
				},
				{
					position: 3,
					book: { ...BOOK_DOCUMENT, id: 103, release_year: null },
				},
			]),
		);

		expect(results[0]?.releaseDate).toBe("1200-01-01 BC");
		expect(results[1]?.releaseDate).toBe("2020-01-01");
		expect(results[2]?.releaseDate).toBeUndefined();
	});

	it("maps the series metadata each book carries", async () => {
		const { results } = await fetchSeriesBooksWith(
			seriesBooksResponse([{ position: 1, book: BOOK_DOCUMENT }]),
		);

		expect(results[0]?.metadata).toEqual({
			series: "Mistborn",
			seriesBookNumber: "1",
			author: "Brandon Sanderson",
			pageCount: 541,
		});
	});

	it("returns nothing and issues no request without an API key", async () => {
		const { results, fetchMock } = await fetchSeriesBooksWith(
			seriesBooksResponse([{ position: 1, book: BOOK_DOCUMENT }]),
			{ hasApiKey: false },
		);

		expect(results).toEqual([]);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("returns nothing when the response carries GraphQL errors", async () => {
		const { results } = await fetchSeriesBooksWith({
			status: 200,
			ok: true,
			json: async () => ({ errors: [{ message: "boom" }] }),
		});

		expect(results).toEqual([]);
	});

	it("returns nothing when the response is not ok", async () => {
		const { results } = await fetchSeriesBooksWith({
			status: 500,
			ok: false,
			json: async () => ({}),
		});

		expect(results).toEqual([]);
	});

	// gql throws RateLimitError on a 429 rather than returning null, so this is
	// the one failure path that would otherwise escape as an exception.
	it("swallows a rate-limit response rather than throwing", async () => {
		const { results } = await fetchSeriesBooksWith({
			status: 429,
			ok: false,
			json: async () => ({}),
		});

		expect(results).toEqual([]);
	});

	it("returns nothing when the series is not found", async () => {
		const { results } = await fetchSeriesBooksWith(
			mockGraphqlResponse({ series: [] }),
		);

		expect(results).toEqual([]);
	});

	// Hardcover holds duplicate series rows under one name, some of them empty
	// stubs. Without this ordering the query can land on the stub and report a
	// series the user owns one book of as having nothing missing.
	it("asks for the most populated of the duplicate series rows", async () => {
		const { fetchMock } = await fetchSeriesBooksWith(
			seriesBooksResponse([{ position: 1, book: BOOK_DOCUMENT }]),
		);

		const { query } = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body ?? "{}");
		expect(query).toMatch(/order_by:\s*{\s*books_count:\s*desc\s*}/);
	});

	it("scopes the book_series lookup to English or unlabeled editions", async () => {
		const { fetchMock } = await fetchSeriesBooksWith(
			seriesBooksResponse([{ position: 1, book: BOOK_DOCUMENT }]),
		);

		const { query } = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body ?? "{}");
		expect(query).toMatch(
			/default_physical_edition_id:\s*{\s*_is_null:\s*true\s*}/,
		);
		expect(query).toMatch(
			/default_physical_edition:\s*{\s*language_id:\s*{\s*_is_null:\s*true\s*}\s*}/,
		);
		expect(query).toMatch(
			/default_physical_edition:\s*{\s*language_id:\s*{\s*_eq:\s*1\s*}\s*}/,
		);
	});

	it("scopes the series lookup to a known author when one is given", async () => {
		const { fetchMock } = await fetchSeriesBooksWith(
			seriesBooksResponse([{ position: 1, book: BOOK_DOCUMENT }]),
			{ knownAuthorNames: ["Signe Pike"] },
		);

		const { query, variables } = JSON.parse(
			fetchMock.mock.calls[0]?.[1]?.body ?? "{}",
		);
		expect(query).toMatch(
			/book_series:\s*{\s*book:\s*{\s*contributions:\s*{\s*author:\s*{\s*name:\s*{\s*_in:\s*\$authors\s*}\s*}\s*}\s*}\s*}/,
		);
		expect(variables.authors).toEqual(["Signe Pike"]);
	});

	it("does not scope the series lookup by author when none is known", async () => {
		const { fetchMock } = await fetchSeriesBooksWith(
			seriesBooksResponse([{ position: 1, book: BOOK_DOCUMENT }]),
		);

		const { query, variables } = JSON.parse(
			fetchMock.mock.calls[0]?.[1]?.body ?? "{}",
		);
		expect(query).not.toMatch(/book_series:\s*{\s*book:\s*{\s*contributions/);
		expect(variables.authors).toBeUndefined();
	});

	it("skips a series entry whose book is missing", async () => {
		const { results } = await fetchSeriesBooksWith(
			seriesBooksResponse([
				{ position: 1, book: null },
				{ position: 2, book: BOOK_DOCUMENT },
			]),
		);

		expect(results).toHaveLength(1);
		expect(results[0]?.externalId).toBe("101");
	});
});
