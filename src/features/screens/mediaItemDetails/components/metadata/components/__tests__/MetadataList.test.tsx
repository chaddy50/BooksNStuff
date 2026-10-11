import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MetadataList } from "#/features/screens/mediaItemDetails/components/metadata/components/MetadataList";
import { MediaItemType } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

afterEach(cleanup);

// Creator, series, release year, and tags live in the media item header instead —
// this list only takes type-specific fields and genre.
describe("MetadataList", () => {
	it("shows type-specific details like page count", () => {
		render(
			<MetadataList type={MediaItemType.BOOK} metadata={{ pageCount: 400 }} />,
		);

		expect(screen.getByText("400")).toBeInTheDocument();
	});

	it("shows a movie's runtime", () => {
		render(
			<MetadataList type={MediaItemType.MOVIE} metadata={{ runtime: 120 }} />,
		);

		expect(screen.getByText("2 time.hours")).toBeInTheDocument();
	});

	it("shows a tv show's season count", () => {
		render(
			<MetadataList type={MediaItemType.TV_SHOW} metadata={{ seasons: 3 }} />,
		);

		expect(screen.getByText("3")).toBeInTheDocument();
	});

	it("shows a video game's platforms", () => {
		render(
			<MetadataList
				type={MediaItemType.VIDEO_GAME}
				metadata={{ platforms: ["PC", "PS5"] }}
			/>,
		);

		expect(screen.getByText("PC, PS5")).toBeInTheDocument();
	});

	it("shows a podcast's episode count", () => {
		render(
			<MetadataList
				type={MediaItemType.PODCAST}
				metadata={{ episodeTitles: ["Ep 1", "Ep 2"] }}
			/>,
		);

		expect(screen.getByText("2 podcast.episodesCount")).toBeInTheDocument();
	});

	it("shows the genre when both a name and id are known", () => {
		render(
			<MetadataList
				type={MediaItemType.BOOK}
				metadata={null}
				genreId={3}
				genreName="Sci-Fi"
			/>,
		);

		expect(screen.getByText("Sci-Fi")).toBeInTheDocument();
	});

	it("returns nothing when there is no content left to show", () => {
		const { container } = render(
			<MetadataList type={MediaItemType.BOOK} metadata={null} />,
		);

		expect(container).toBeEmptyDOMElement();
	});
});
