import { MediaItemType } from "#/lib/enums";
import { releaseYearToDate } from "#/lib/releaseDate";
import type { ExternalSearchResult } from "./types";

export class RateLimitError extends Error {
	constructor() {
		super("Hardcover API rate limit exceeded");
		this.name = "RateLimitError";
	}
}

// Token from https://hardcover.app/account/api — already includes "Bearer " prefix
const API_KEY = process.env.HARDCOVER_API_KEY;
const ENDPOINT = "https://api.hardcover.app/v1/graphql";

// Step 1: keyword search — returns an opaque JSON blob from Typesense
const SEARCH_QUERY = `
  query SearchBooks($query: String!) {
    search(query: $query, query_type: "Book", per_page: 10, page: 1) {
      results
    }
  }
`;

// Step 2: fetch cover images by ID using the structured books() query
const IMAGES_QUERY = `
  query BookImages($ids: [Int!]!) {
    books(where: { id: { _in: $ids } }) {
      id
      image {
        url
      }
    }
  }
`;

type SearchHit = {
	id: string; // Typesense returns IDs as strings
	title: string;
	description?: string;
	author_names?: string[];
	series_names?: string[];
	featured_series_position?: number;
	genres?: string[];
	pages?: number;
	release_year?: number;
};

// Step 3: fetch series description and completion status by name.
// Ordered by books_count for the same duplicate-row reason as SERIES_BOOKS_QUERY
// below — the stub duplicates carry no description.
const SERIES_INFO_QUERY = `
  query SeriesInfo($name: String!) {
    series(
      where: { name: { _eq: $name } }
      order_by: { books_count: desc }
      limit: 1
    ) {
      description
      is_completed
    }
  }
`;

// Step 4: fetch author biography by name
const CREATOR_BIO_QUERY = `
  query CreatorBio($name: String!) {
    authors(where: { name: { _eq: $name } }, limit: 1) {
      bio
    }
  }
`;

// Step 5: fetch every book in a series, in reading order.
//
// Hardcover sometimes holds two entirely unrelated series under the identical
// name, each with its own books_count — "The Lost Queen" is both a 2-book
// series by Signe Pike and an unrelated 3-book series by Jessica Thorne.
// `order_by: books_count desc, limit: 1` alone can land on the wrong one, and
// since the whole roster then comes from a stranger's series, no per-book
// filter downstream can recover the right one. When the caller already knows
// at least one author in the series (from books the user owns), that author
// is pushed into the series-selection `where` itself so the right row is
// chosen in the first place; the SERIES_INFO_QUERY and SERIES_BOOKS_QUERY
// books_count tiebreak otherwise only exists to skip Hardcover's empty stub
// duplicates.
//
// book_series excludes only editions explicitly tagged in a language other
// than English. A book with no default physical edition on file, or one
// whose language was never tagged, is kept rather than excluded — Hardcover
// leaves language blank on plenty of legitimately-English editions, and
// losing a real missing book is worse than occasionally keeping an
// unlabeled foreign one.
const BOOK_LANGUAGE_WHERE = `
	        _or: [
	          { default_physical_edition_id: { _is_null: true } }
	          { default_physical_edition: { language_id: { _is_null: true } } }
	          { default_physical_edition: { language_id: { _eq: 1 } } }
	        ]
`;

function buildSeriesBooksQuery(hasKnownAuthors: boolean): string {
	const seriesWhere = hasKnownAuthors
		? `{ name: { _eq: $name }, book_series: { book: { contributions: { author: { name: { _in: $authors } } } } } }`
		: `{ name: { _eq: $name } }`;
	const authorsVariable = hasKnownAuthors ? ", $authors: [String!]!" : "";

	return `
	  query SeriesBooks($name: String!${authorsVariable}) {
	    series(
	      where: ${seriesWhere}
	      order_by: { books_count: desc }
	      limit: 1
	    ) {
	      book_series(
	        where: { book: {${BOOK_LANGUAGE_WHERE}} }
	        order_by: { position: asc }
	      ) {
	        position
	        book {
	          id
	          title
	          description
	          pages
	          release_year
	          image {
	            url
	          }
	          contributions {
	            author {
	              name
	            }
	          }
	          default_physical_edition {
	            language_id
	          }
	        }
	      }
	    }
	  }
	`;
}

type SeriesInfoResult = {
	description: string | null;
	is_completed: boolean | null;
};

type SeriesBookEntry = {
	position: number | null;
	book: {
		id: number;
		title: string;
		description?: string | null;
		pages?: number | null;
		release_year?: number | null;
		image?: { url: string } | null;
		contributions?: Array<{ author?: { name: string } | null }> | null;
		default_physical_edition?: { language_id: number | null } | null;
	} | null;
};

const ENGLISH_LANGUAGE_ID = 1;

/**
 * Hardcover often lists a book under several editions at once — a boxed set,
 * a translation, a duplicate placeholder — all sharing the series' same
 * position. When at least one of them is confirmed English, only that one is
 * the book the user is actually missing; the rest are the same book, not
 * different ones. A position with no confirmed-English candidate at all is
 * left untouched, since there's nothing to prefer it over.
 */
function preferConfirmedEnglishPerPosition(
	candidates: Array<{
		result: ExternalSearchResult;
		languageId: number | null;
	}>,
): ExternalSearchResult[] {
	const positionGroups = new Map<
		string | symbol,
		Array<{ result: ExternalSearchResult; languageId: number | null }>
	>();

	for (const candidate of candidates) {
		const position = candidate.result.metadata.seriesBookNumber;
		// A book with no recorded position gets its own group — two unrelated
		// unpositioned books should never be compared against each other.
		const key: string | symbol = position === undefined ? Symbol() : position;
		const group = positionGroups.get(key) ?? [];
		group.push(candidate);
		positionGroups.set(key, group);
	}

	return [...positionGroups.values()].flatMap((group) => {
		const confirmedEnglish = group.filter(
			(candidate) => candidate.languageId === ENGLISH_LANGUAGE_ID,
		);
		const survivors = confirmedEnglish.length > 0 ? confirmedEnglish : group;
		return survivors.map((candidate) => candidate.result);
	});
}

type CreatorBioResult = {
	bio: string | null;
};

type BookImage = {
	id: number;
	image: { url: string } | null;
};

async function gql<T>(
	query: string,
	variables: Record<string, unknown>,
): Promise<T | null> {
	if (!API_KEY) return null;

	const res = await fetch(ENDPOINT, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: API_KEY,
			"User-Agent": "media-tracker/1.0",
		},
		body: JSON.stringify({ query, variables }),
	});

	if (res.status === 429) throw new RateLimitError();
	if (!res.ok) return null;

	const { data, errors } = await res.json();
	if (errors?.length) return null;

	return data as T;
}

/** Hardcover returns protocol-relative paths like "assets.hardcover.app/...". */
function toAbsoluteImageUrl(
	url: string | null | undefined,
): string | undefined {
	if (!url) return undefined;
	return url.startsWith("http") ? url : `https://${url}`;
}

function parseHits(results: unknown): SearchHit[] {
	if (Array.isArray(results)) return results as SearchHit[];
	// Typesense-wrapped format: { hits: [{ document: {...} }] }
	if (results && typeof results === "object" && "hits" in results) {
		const r = results as { hits?: Array<{ document: SearchHit }> };
		return (r.hits ?? []).map((h) => h.document);
	}
	return [];
}

export async function fetchSeriesInfo(
	name: string,
): Promise<{ description: string | null; isComplete: boolean } | null> {
	const data = await gql<{ series: SeriesInfoResult[] }>(SERIES_INFO_QUERY, {
		name,
	});
	if (!data || data.series.length === 0) {
		return null;
	}
	const row = data.series[0];
	if (!row) {
		return null;
	}
	return {
		description: row.description ?? null,
		isComplete: row.is_completed ?? false,
	};
}

/**
 * Every book Hardcover lists for a series, in reading order.
 *
 * Returns [] rather than throwing on any failure — the only caller renders a
 * supplementary section of the series page, so an upstream outage or a rate
 * limit should leave that section empty rather than break the page.
 */
export async function fetchSeriesBooks(
	name: string,
	knownAuthorNames: string[] = [],
): Promise<ExternalSearchResult[]> {
	if (!API_KEY) return [];

	const query = buildSeriesBooksQuery(knownAuthorNames.length > 0);
	const variables =
		knownAuthorNames.length > 0
			? { name, authors: knownAuthorNames }
			: { name };

	let data: { series: Array<{ book_series: SeriesBookEntry[] }> } | null = null;
	try {
		data = await gql<{ series: Array<{ book_series: SeriesBookEntry[] }> }>(
			query,
			variables,
		);
	} catch {
		// gql throws RateLimitError on a 429; every other failure returns null.
		return [];
	}

	const entries = data?.series[0]?.book_series;
	if (!entries) return [];

	const candidates = entries.flatMap((entry) => {
		const { book } = entry;
		if (!book) return [];

		return [
			{
				languageId: book.default_physical_edition?.language_id ?? null,
				result: {
					externalId: String(book.id),
					externalSource: "hardcover",
					type: MediaItemType.BOOK,
					title: book.title,
					description: book.description ?? undefined,
					coverImageUrl: toAbsoluteImageUrl(book.image?.url),
					releaseDate: releaseYearToDate(book.release_year),
					metadata: {
						// handleAddToLibrary reads metadata.series to file the added item
						// under this series — without it the item would never appear in the
						// series' library grid.
						series: name,
						seriesBookNumber:
							entry.position === null ? undefined : String(entry.position),
						author: book.contributions?.[0]?.author?.name,
						pageCount: book.pages ?? undefined,
					},
				},
			},
		];
	});

	return preferConfirmedEnglishPerPosition(candidates);
}

export async function fetchCreatorBio(
	name: string,
): Promise<{ biography: string | null } | null> {
	const data = await gql<{ authors: CreatorBioResult[] }>(CREATOR_BIO_QUERY, {
		name,
	});
	if (!data || data.authors.length === 0) {
		return null;
	}
	const row = data.authors[0];
	if (!row) {
		return null;
	}
	return { biography: row.bio ?? null };
}

export async function search(query: string): Promise<ExternalSearchResult[]> {
	if (!API_KEY) return [];

	const searchData = await gql<{ search: { results: unknown } }>(SEARCH_QUERY, {
		query,
	});
	if (!searchData) return [];

	const hits = parseHits(searchData.search.results);
	if (hits.length === 0) return [];

	// Fetch cover images for all results in a single follow-up query.
	// Typesense returns IDs as strings; the books() query requires [Int!]!
	const ids = hits.map((h) => Number(h.id)).filter((id) => id > 0);
	const imageData = await gql<{ books: BookImage[] }>(IMAGES_QUERY, { ids });
	// Key by string so it matches hit.id (also a string from Typesense)
	const imageById = new Map(
		(imageData?.books ?? []).map(
			(b) => [String(b.id), toAbsoluteImageUrl(b.image?.url)] as const,
		),
	);

	return hits.map((hit) => {
		const metadata: Record<string, unknown> = {
			author: hit.author_names?.[0],
			pageCount: hit.pages,
			genres: hit.genres?.slice(0, 5),
		};

		if (hit.series_names?.[0]) {
			metadata.series = hit.series_names[0];
		}

		if (hit.featured_series_position != null) {
			metadata.seriesBookNumber = String(hit.featured_series_position);
		}

		return {
			externalId: String(hit.id),
			externalSource: "hardcover",
			type: MediaItemType.BOOK,
			title: hit.title,
			description: hit.description,
			coverImageUrl: imageById.get(hit.id),
			releaseDate: releaseYearToDate(hit.release_year),
			metadata,
		};
	});
}
