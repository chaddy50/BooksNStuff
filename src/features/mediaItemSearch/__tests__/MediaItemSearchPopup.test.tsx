import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchPopup } from "#/features/mediaItemSearch/MediaItemSearchPopup";

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
		SearchEntryField: () => null,
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
		SearchResults: () => null,
	}),
);

afterEach(cleanup);

describe("SearchPopup", () => {
	it("gives the dialog an accessible description", () => {
		render(<SearchPopup isOpen onClose={vi.fn()} />);

		expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
			"search.description",
		);
	});
});
