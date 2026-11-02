import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ItemTypeFilter } from "#/features/screens/insights/components/ItemTypeFilter";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const labels: Record<string, string> = {
				"insights.itemTypeFilter.label": "Filter by type",
				"mediaType.book": "Book",
				"mediaType.movie": "Movie",
				"mediaType.tv_show": "TV Show",
				"mediaType.video_game": "Video Game",
				"mediaType.podcast": "Podcast",
				"library.clearFilters": "Clear filters",
			};
			return labels[key] ?? key;
		},
	}),
}));

afterEach(() => {
	cleanup();
});

describe("ItemTypeFilter", () => {
	it("shows the filter label as the trigger when nothing is selected", () => {
		render(<ItemTypeFilter selectedItemTypes={[]} onToggle={vi.fn()} />);

		expect(
			screen.getByRole("button", { name: "Filter by type" }),
		).toBeInTheDocument();
	});

	it("lists every media type as an option", () => {
		render(<ItemTypeFilter selectedItemTypes={[]} onToggle={vi.fn()} />);

		fireEvent.click(screen.getByRole("button", { name: "Filter by type" }));

		expect(screen.getByRole("button", { name: "Book" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Movie" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "TV Show" })).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Video Game" }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Podcast" })).toBeInTheDocument();
	});

	it("calls onToggle with the media type when an option is clicked", () => {
		const onToggle = vi.fn();
		render(<ItemTypeFilter selectedItemTypes={[]} onToggle={onToggle} />);

		fireEvent.click(screen.getByRole("button", { name: "Filter by type" }));
		fireEvent.click(screen.getByRole("button", { name: "Movie" }));

		expect(onToggle).toHaveBeenCalledWith("movie");
	});

	it("shows the selected type's label as the trigger text", () => {
		render(<ItemTypeFilter selectedItemTypes={["book"]} onToggle={vi.fn()} />);

		expect(screen.getByRole("button", { name: "Book" })).toBeInTheDocument();
	});

	it("does not show a clear button when nothing is selected", () => {
		render(
			<ItemTypeFilter
				selectedItemTypes={[]}
				onToggle={vi.fn()}
				onClear={vi.fn()}
			/>,
		);

		expect(
			screen.queryByRole("button", { name: "Clear filters" }),
		).not.toBeInTheDocument();
	});

	it("shows a clear button once a type is selected", () => {
		render(
			<ItemTypeFilter
				selectedItemTypes={["book"]}
				onToggle={vi.fn()}
				onClear={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Clear filters" }),
		).toBeInTheDocument();
	});

	it("calls onClear when the clear button is clicked", () => {
		const onClear = vi.fn();
		render(
			<ItemTypeFilter
				selectedItemTypes={["book", "movie"]}
				onToggle={vi.fn()}
				onClear={onClear}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

		expect(onClear).toHaveBeenCalled();
	});
});
