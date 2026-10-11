import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileStatsRow } from "#/components/ProfileStatsRow";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

describe("ProfileStatsRow", () => {
	it("renders the items and completed counts, including a zero completed count", () => {
		render(
			<ProfileStatsRow
				stats={{ totalCount: 9, completedCount: 0, averageRating: null }}
			/>,
		);

		expect(screen.getByText("9")).toBeInTheDocument();
		expect(screen.getByText("stats.items")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
		expect(screen.getByText("stats.completed")).toBeInTheDocument();
	});

	it("renders the average rating to one decimal place when present", () => {
		render(
			<ProfileStatsRow
				stats={{ totalCount: 9, completedCount: 7, averageRating: 4.6 }}
			/>,
		);

		expect(screen.getByText("4.6")).toBeInTheDocument();
	});

	it("omits the average rating stat when it is null", () => {
		render(
			<ProfileStatsRow
				stats={{ totalCount: 9, completedCount: 0, averageRating: null }}
			/>,
		);

		expect(screen.queryByText("stats.averageRating")).not.toBeInTheDocument();
	});
});
