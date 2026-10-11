import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/lib/enums";
import { EditMetadataDialog } from "../EditMetadataDialog";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: vi.fn() }),
}));

vi.mock("#/features/mediaItemSearch/components/PodcastArcPickerDialog", () => ({
	PodcastArcPickerDialog: () => null,
}));

vi.mock("../editMetadata/SeriesField", () => ({ SeriesField: () => null }));
vi.mock("../editMetadata/CreatorField", () => ({ CreatorField: () => null }));
vi.mock("../editMetadata/GenreField", () => ({ GenreField: () => null }));
vi.mock("../editMetadata/BookFields", () => ({ BookFields: () => null }));
vi.mock("../editMetadata/MovieFields", () => ({ MovieFields: () => null }));
vi.mock("../editMetadata/TvShowFields", () => ({ TvShowFields: () => null }));
vi.mock("../editMetadata/GameFields", () => ({ GameFields: () => null }));
vi.mock("../TagsEditor", () => ({ TagsEditor: () => null }));

const mediaItemDetails = {
	id: 1,
	title: "A Memory Called Empire",
	description: null,
	coverImageUrl: null,
	releaseDate: null,
	metadata: null,
	type: MediaItemType.BOOK,
	seriesId: null,
	seriesName: null,
	creatorId: null,
	creatorName: null,
	genreId: null,
	genreName: null,
	tags: [],
} as unknown as Parameters<typeof EditMetadataDialog>[0]["mediaItemDetails"];

afterEach(cleanup);

describe("EditMetadataDialog", () => {
	it("shows a labeled Edit trigger instead of a bare icon button", () => {
		render(<EditMetadataDialog mediaItemDetails={mediaItemDetails} />);

		expect(
			screen.getByRole("button", { name: "mediaItemDetails.edit" }),
		).toBeInTheDocument();
	});

	it("opens the edit dialog when the trigger is clicked", () => {
		render(<EditMetadataDialog mediaItemDetails={mediaItemDetails} />);

		fireEvent.click(
			screen.getByRole("button", { name: "mediaItemDetails.edit" }),
		);

		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});
});
