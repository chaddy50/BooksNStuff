import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "#/components/ui/tooltip";
import { GenreItems } from "#/features/screens/genreDetails/components/GenreItems";
import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";
import type { GenreItem } from "#/lib/genres/genres";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => children,
}));

function buildGenreItem(overrides: Partial<GenreItem> = {}): GenreItem {
	return {
		id: 1,
		title: "Dune",
		type: MediaItemType.BOOK,
		coverImageUrl: "https://example.com/cover.jpg",
		status: MediaItemStatus.BACKLOG,
		purchaseStatus: PurchaseStatus.NOT_PURCHASED,
		expectedReleaseDate: null,
		rating: 0,
		...overrides,
	} as GenreItem;
}

function renderItems(items: GenreItem[]) {
	return render(
		<TooltipProvider>
			<GenreItems items={items} />
		</TooltipProvider>,
	);
}

afterEach(cleanup);

describe("GenreItems", () => {
	it("shows the empty-library message when there are no items", () => {
		renderItems([]);

		expect(screen.getByText("genreDetails.items")).toBeInTheDocument();
		expect(screen.getByText("library.empty")).toBeInTheDocument();
	});

	it("renders a card for each item and no empty message", () => {
		renderItems([
			buildGenreItem({ id: 1, title: "Dune" }),
			buildGenreItem({ id: 2, title: "Foundation" }),
		]);

		expect(screen.getByAltText("Dune")).toBeInTheDocument();
		expect(screen.getByAltText("Foundation")).toBeInTheDocument();
		expect(screen.queryByText("library.empty")).not.toBeInTheDocument();
	});

	it("shows a type badge for each item", () => {
		renderItems([
			buildGenreItem({ id: 1 }),
			buildGenreItem({ id: 2, type: MediaItemType.MOVIE }),
		]);

		expect(screen.getAllByTestId("type-badge")).toHaveLength(2);
	});
});
