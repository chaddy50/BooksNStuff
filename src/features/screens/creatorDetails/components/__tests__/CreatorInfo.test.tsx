import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreatorInfo } from "#/features/screens/creatorDetails/components/CreatorInfo";
import type { CreatorDetails } from "#/features/screens/creatorDetails/creatorDetails";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

// Keeps the server functions out of jsdom.
vi.mock("#/features/screens/creatorDetails/creatorDetails", () => ({
	updateCreatorMetadata: vi.fn(),
}));

vi.mock(
	"#/features/screens/creatorDetails/components/EditCreatorDialog",
	() => ({
		EditCreatorDialog: () => <div data-testid="edit-creator-dialog" />,
	}),
);

function buildCreatorDetails(
	overrides: Partial<CreatorDetails> = {},
): CreatorDetails {
	return {
		id: 1,
		userId: "user-a",
		name: "N.K. Jemisin",
		biography: null,
		sortName: "Jemisin",
		createdAt: new Date(),
		updatedAt: new Date(),
		items: [],
		stats: { totalCount: 0, completedCount: 0, averageRating: null },
		role: null,
		...overrides,
	} as CreatorDetails;
}

afterEach(cleanup);

describe("CreatorInfo", () => {
	it("renders the avatar, name, and stats row", () => {
		render(
			<CreatorInfo
				creatorDetails={buildCreatorDetails({
					stats: { totalCount: 9, completedCount: 7, averageRating: 4.6 },
				})}
			/>,
		);

		expect(screen.getByText("NJ")).toBeInTheDocument();
		expect(screen.getByText("N.K. Jemisin")).toBeInTheDocument();
		expect(screen.getByText("9")).toBeInTheDocument();
		expect(screen.getByText("7")).toBeInTheDocument();
		expect(screen.getByText("4.6")).toBeInTheDocument();
	});

	it("shows the translated role badge when a role is derivable", () => {
		render(
			<CreatorInfo
				creatorDetails={buildCreatorDetails({
					items: [
						{
							id: 1,
							status: MediaItemStatus.BACKLOG,
							purchaseStatus: "not_purchased",
							expectedReleaseDate: null,
							title: "Dune",
							type: MediaItemType.BOOK,
							coverImageUrl: null,
							metadata: {},
							rating: 0,
							completedAt: null,
						},
					] as CreatorDetails["items"],
					role: "author",
				})}
			/>,
		);

		expect(screen.getByText("metadata.author")).toBeInTheDocument();
	});

	it("renders no role badge for a creator with no derivable role", () => {
		render(
			<CreatorInfo creatorDetails={buildCreatorDetails({ role: null })} />,
		);

		expect(screen.queryByText(/metadata\./)).not.toBeInTheDocument();
	});
});
