import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "#/components/ui/tooltip";
import { SearchResults } from "#/features/mediaItemSearch/components/searchResults/SearchResults";
import type { SearchResultWithStatus } from "#/features/mediaItemSearch/types";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, options?: { year: number }) =>
			key === "time.yearBCE" ? `${options?.year} BCE` : key,
	}),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	useRouter: () => ({}),
	useNavigate: () => () => {},
}));

vi.mock("#/components/hooks/useToast", () => ({
	useToast: () => ({ toast: vi.fn() }),
}));

const baseProps = {
	isSearching: false,
	query: "",
	results: [] as SearchResultWithStatus[],
	onClose: vi.fn(),
};

function renderSearchResults(props: Partial<typeof baseProps>) {
	return render(
		<TooltipProvider>
			<SearchResults {...baseProps} {...props} />
		</TooltipProvider>,
	);
}

afterEach(cleanup);

describe("SearchResults", () => {
	it("shows searching message while a search is in progress", () => {
		renderSearchResults({ isSearching: true, query: "dune" });
		expect(screen.getByText("search.searching")).toBeInTheDocument();
	});

	it("shows prompt message when the query is empty", () => {
		renderSearchResults({ query: "" });
		expect(screen.getByText("search.prompt")).toBeInTheDocument();
	});

	it("shows no-results message when search finished with no results", () => {
		renderSearchResults({ query: "xyzzy", results: [] });
		expect(screen.getByText("search.noResults")).toBeInTheDocument();
	});

	it("shows result items and no message when results are present", () => {
		const results: SearchResultWithStatus[] = [
			{
				title: "Dune",
				externalId: "1",
				externalSource: "tmdb",
				type: "movie",
				metadata: {},
			},
		];
		renderSearchResults({ query: "dune", results });
		expect(screen.queryByText("search.noResults")).not.toBeInTheDocument();
		expect(screen.queryByText("search.prompt")).not.toBeInTheDocument();
	});

	it("shows a pre-0 CE release year with a BCE suffix", () => {
		const results: SearchResultWithStatus[] = [
			{
				title: "The Epic of Gilgamesh",
				externalId: "785115",
				externalSource: "hardcover",
				type: "book",
				releaseDate: "1200-01-01 BC",
				metadata: {},
			},
		];
		renderSearchResults({ query: "gilgamesh", results });

		expect(screen.getByText("1200 BCE")).toBeInTheDocument();
		expect(screen.queryByText("-120")).not.toBeInTheDocument();
	});

	it("shows a CE release year as a bare year", () => {
		const results: SearchResultWithStatus[] = [
			{
				title: "Dune",
				externalId: "1",
				externalSource: "hardcover",
				type: "book",
				releaseDate: "2020-01-01",
				metadata: {},
			},
		];
		renderSearchResults({ query: "dune", results });

		expect(screen.getByText("2020")).toBeInTheDocument();
	});

	it("shows the author and numbered series for book results", () => {
		const results: SearchResultWithStatus[] = [
			{
				title: "Dune",
				externalId: "1",
				externalSource: "hardcover",
				type: "book",
				metadata: {
					author: "Frank Herbert",
					series: "Dune",
					seriesBookNumber: "1",
				},
			},
		];
		renderSearchResults({ query: "dune", results });

		expect(screen.getByText("Frank Herbert")).toBeInTheDocument();
		expect(screen.getByText("Dune #1")).toBeInTheDocument();
	});

	it("separates the year and the series with a dot", () => {
		const results: SearchResultWithStatus[] = [
			{
				title: "Dune",
				externalId: "1",
				externalSource: "hardcover",
				type: "book",
				releaseDate: "1965-08-01",
				metadata: { series: "Dune", seriesBookNumber: "1" },
			},
		];
		renderSearchResults({ query: "dune", results });

		expect(screen.getByText("1965 · Dune #1")).toBeInTheDocument();
	});

	it("shows the series without a number when the position is unknown", () => {
		const results: SearchResultWithStatus[] = [
			{
				title: "Elden Ring",
				externalId: "1",
				externalSource: "igdb",
				type: "video_game",
				metadata: { developer: "FromSoftware", series: "Souls" },
			},
		];
		renderSearchResults({ query: "elden", results });

		expect(screen.getByText("FromSoftware")).toBeInTheDocument();
		expect(screen.getByText("Souls")).toBeInTheDocument();
	});

	it("shows the creator for podcast results", () => {
		const results: SearchResultWithStatus[] = [
			{
				title: "Hardcore History",
				externalId: "1",
				externalSource: "itunes",
				type: "podcast",
				metadata: { creator: "Dan Carlin" },
			},
		];
		renderSearchResults({ query: "hardcore", results });

		expect(screen.getByText("Dan Carlin")).toBeInTheDocument();
	});

	it("shows no creator line for tv show results without one", () => {
		const results: SearchResultWithStatus[] = [
			{
				title: "Breaking Bad",
				externalId: "1",
				externalSource: "tmdb",
				type: "tv_show",
				releaseDate: "2008-01-20",
				metadata: {},
			},
		];
		renderSearchResults({ query: "breaking", results });

		expect(screen.getByText("Breaking Bad")).toBeInTheDocument();
		expect(screen.getByText("2008")).toBeInTheDocument();
	});

	it("shows the creator for tv show results that have one", () => {
		const results: SearchResultWithStatus[] = [
			{
				title: "Breaking Bad",
				externalId: "1",
				externalSource: "tmdb",
				type: "tv_show",
				metadata: { creator: "Vince Gilligan" },
			},
		];
		renderSearchResults({ query: "breaking", results });

		expect(screen.getByText("Vince Gilligan")).toBeInTheDocument();
	});
});
