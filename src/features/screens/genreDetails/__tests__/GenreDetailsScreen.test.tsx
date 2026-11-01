import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GenreDetailsScreen } from "#/features/screens/genreDetails/GenreDetailsScreen";
import type { GenreDetails, GenreItem } from "#/lib/genres/genres";

const genreDetailsFixture: GenreDetails = {
	id: 1,
	userId: "user-a",
	name: "Science Fiction",
	createdAt: new Date(),
	items: [{ id: 1 }, { id: 2 }] as GenreItem[],
	stats: { totalCount: 2, completedCount: 1, averageRating: 4 },
};

vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({ useLoaderData: () => genreDetailsFixture }),
}));

vi.mock("#/features/navigation/topBar/TopBar", () => ({
	TopBar: () => <div data-testid="top-bar" />,
}));

vi.mock("#/features/screens/genreDetails/components/GenreInfo", () => ({
	GenreInfo: ({ genreDetails }: { genreDetails: GenreDetails }) => (
		<div data-testid="genre-info" data-name={genreDetails.name} />
	),
}));

vi.mock("#/features/screens/genreDetails/components/GenreItems", () => ({
	GenreItems: ({ items }: { items: GenreItem[] }) => (
		<div data-testid="genre-items" data-item-count={items.length} />
	),
}));

afterEach(cleanup);

describe("GenreDetailsScreen", () => {
	it("renders GenreInfo with the loaded genre details", () => {
		render(<GenreDetailsScreen />);

		expect(screen.getByTestId("genre-info")).toHaveAttribute(
			"data-name",
			"Science Fiction",
		);
	});

	it("renders GenreItems with the loaded items, after GenreInfo", () => {
		render(<GenreDetailsScreen />);

		const genreInfo = screen.getByTestId("genre-info");
		const genreItems = screen.getByTestId("genre-items");

		expect(genreItems).toHaveAttribute("data-item-count", "2");
		expect(
			genreInfo.compareDocumentPosition(genreItems) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});
});
