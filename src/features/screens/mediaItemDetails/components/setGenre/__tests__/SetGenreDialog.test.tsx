import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SetGenreDialog } from "#/features/screens/mediaItemDetails/components/setGenre/SetGenreDialog";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("#/lib/genres/genres", () => ({
	getGenres: vi.fn().mockResolvedValue([]),
	saveMediaItemGenre: vi.fn<() => Promise<void>>().mockResolvedValue(),
}));

afterEach(cleanup);

describe("SetGenreDialog", () => {
	it("saves the clicked suggested genre", async () => {
		const { saveMediaItemGenre } = await import("#/lib/genres/genres");
		const onClose = vi.fn();
		render(
			<SetGenreDialog
				isOpen
				onClose={onClose}
				mediaItemId={7}
				suggestedGenres={["Fantasy", "Mystery"]}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: /^Fantasy/ }));
		fireEvent.click(screen.getByRole("button", { name: "common.save" }));

		await vi.waitFor(() =>
			expect(saveMediaItemGenre).toHaveBeenCalledWith({
				data: { mediaItemId: 7, genreName: "Fantasy" },
			}),
		);
		expect(onClose).toHaveBeenCalled();
	});

	it("marks a suggested genre not already in the user's library as new", async () => {
		render(
			<SetGenreDialog
				isOpen
				onClose={vi.fn()}
				mediaItemId={7}
				suggestedGenres={["Space Opera"]}
			/>,
		);

		await vi.waitFor(() => screen.getByRole("button", { name: /Space Opera/ }));
		const chip = screen.getByRole("button", { name: /Space Opera/ });
		expect(chip).toHaveTextContent("genre.newGenreBadge");
	});

	it("does not mark a suggested genre that already exists in the user's library as new", async () => {
		const { getGenres } = await import("#/lib/genres/genres");
		vi.mocked(getGenres).mockResolvedValueOnce([{ id: 1, name: "Fantasy" }]);

		render(
			<SetGenreDialog
				isOpen
				onClose={vi.fn()}
				mediaItemId={7}
				suggestedGenres={["Fantasy"]}
			/>,
		);

		await vi.waitFor(() => screen.getByRole("button", { name: "Fantasy" }));
		const chip = screen.getByRole("button", { name: "Fantasy" });
		expect(chip).not.toHaveTextContent("New");
	});

	it("disables Save until a genre is selected and renders no dismiss control", () => {
		render(
			<SetGenreDialog
				isOpen
				onClose={vi.fn()}
				mediaItemId={7}
				suggestedGenres={[]}
			/>,
		);

		expect(screen.getByRole("button", { name: "common.save" })).toBeDisabled();
		expect(
			screen.queryByRole("button", { name: /close/i }),
		).not.toBeInTheDocument();
	});
});
