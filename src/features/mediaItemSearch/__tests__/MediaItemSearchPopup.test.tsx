import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchPopup } from "#/features/mediaItemSearch/MediaItemSearchPopup";
import { searchMedia } from "#/features/mediaItemSearch/mediaItemSearch";
import type { SearchResultWithStatus } from "#/features/mediaItemSearch/types";
import { MediaItemType } from "#/lib/enums";

const translate = (key: string) => key;
vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: translate }),
}));

vi.mock("#/features/mediaItemSearch/mediaItemSearch", () => ({
	searchMedia: vi.fn().mockResolvedValue([]),
}));

vi.mock("#/features/mediaItemSearch/components/CreateCustomItemDialog", () => ({
	CreateCustomItemDialog: () => null,
}));

vi.mock(
	"#/features/mediaItemSearch/components/searchField/SearchEntryField",
	() => ({
		SearchEntryField: ({
			query,
			setQuery,
		}: {
			query: string;
			setQuery: (value: string) => void;
		}) => (
			<input
				aria-label="search"
				value={query}
				onChange={(event) => setQuery(event.target.value)}
			/>
		),
	}),
);

vi.mock(
	"#/features/mediaItemSearch/components/searchField/SearchFilters",
	() => ({
		SearchFilters: () => null,
	}),
);

vi.mock(
	"#/features/mediaItemSearch/components/searchResults/SearchResults",
	() => ({
		SearchResults: ({ results }: { results: SearchResultWithStatus[] }) => (
			<div data-testid="results">
				{results.map((result) => result.title).join(",")}
			</div>
		),
	}),
);

afterEach(cleanup);

function makeResult(title: string): SearchResultWithStatus {
	return {
		externalId: title,
		externalSource: "test",
		type: MediaItemType.MOVIE,
		title,
		metadata: {},
	};
}

describe("SearchPopup", () => {
	it("gives the dialog an accessible description", () => {
		render(<SearchPopup isOpen onClose={vi.fn()} />);

		expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
			"search.description",
		);
	});

	it("ignores a stale search response that resolves after a newer one", async () => {
		vi.useFakeTimers();
		const mockedSearchMedia = vi.mocked(searchMedia);
		let resolveFirstSearch: (value: SearchResultWithStatus[]) => void =
			() => {};
		mockedSearchMedia.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolveFirstSearch = resolve;
				}),
		);
		mockedSearchMedia.mockResolvedValueOnce([makeResult("second")]);

		render(<SearchPopup isOpen onClose={vi.fn()} />);
		const input = screen.getByLabelText("search");

		fireEvent.change(input, { target: { value: "first query" } });
		await act(async () => {
			await vi.advanceTimersByTimeAsync(400);
		});

		fireEvent.change(input, { target: { value: "second query" } });
		await act(async () => {
			await vi.advanceTimersByTimeAsync(400);
		});

		expect(screen.getByTestId("results")).toHaveTextContent("second");

		await act(async () => {
			resolveFirstSearch([makeResult("first")]);
			await Promise.resolve();
		});

		expect(screen.getByTestId("results")).toHaveTextContent("second");

		vi.useRealTimers();
	});
});
