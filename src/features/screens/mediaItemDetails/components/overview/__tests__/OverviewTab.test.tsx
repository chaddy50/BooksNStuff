import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/lib/enums";
import { OverviewTab } from "../OverviewTab";

vi.mock(
	"#/features/screens/mediaItemDetails/components/metadata/components/ExpectedReleaseDateInput",
	() => ({
		ExpectedReleaseDateInput: () => <div data-testid="expected-release-date" />,
	}),
);
vi.mock(
	"#/features/screens/mediaItemDetails/components/metadata/components/Description",
	() => ({
		Description: () => <div data-testid="description" />,
	}),
);
vi.mock(
	"#/features/screens/mediaItemDetails/components/metadata/components/MetadataList",
	() => ({
		MetadataList: () => <div data-testid="metadata-list" />,
	}),
);

const mediaItemDetails = {
	id: 1,
	title: "A Memory Called Empire",
	description: null,
	coverImageUrl: null,
	releaseDate: null,
	metadata: null,
	type: MediaItemType.BOOK,
	status: "in_progress",
	purchaseStatus: "not_purchased",
	expectedReleaseDate: null,
	seriesId: null,
	seriesName: null,
	creatorId: null,
	creatorName: null,
	genreId: null,
	genreName: null,
	tags: [],
} as unknown as Parameters<typeof OverviewTab>[0]["mediaItemDetails"];

afterEach(cleanup);

describe("OverviewTab", () => {
	it("renders expected release date, description, and metadata list, in that order", () => {
		render(<OverviewTab mediaItemDetails={mediaItemDetails} />);

		const order = ["expected-release-date", "description", "metadata-list"].map(
			(testId) => screen.getByTestId(testId),
		);

		for (let i = 0; i < order.length - 1; i++) {
			expect(
				order[i].compareDocumentPosition(order[i + 1]) &
					Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
		}
	});
});
