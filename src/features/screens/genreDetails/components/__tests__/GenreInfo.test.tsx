import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GenreInfo } from "#/features/screens/genreDetails/components/GenreInfo";
import type { GenreDetails } from "#/lib/genres/genres";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

function buildGenreDetails(
	overrides: Partial<GenreDetails> = {},
): GenreDetails {
	return {
		id: 1,
		userId: "user-a",
		name: "Science Fiction",
		createdAt: new Date(),
		items: [],
		stats: { totalCount: 0, completedCount: 0, averageRating: null },
		...overrides,
	} as GenreDetails;
}

afterEach(cleanup);

describe("GenreInfo", () => {
	it("renders the avatar, name, and stats row", () => {
		render(
			<GenreInfo
				genreDetails={buildGenreDetails({
					stats: { totalCount: 12, completedCount: 5, averageRating: 3.8 },
				})}
			/>,
		);

		expect(screen.getByText("SF")).toBeInTheDocument();
		expect(screen.getByText("Science Fiction")).toBeInTheDocument();
		expect(screen.getByText("12")).toBeInTheDocument();
		expect(screen.getByText("5")).toBeInTheDocument();
		expect(screen.getByText("3.8")).toBeInTheDocument();
	});
});
