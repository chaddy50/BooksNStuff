import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addToLibrary } from "#/features/mediaItemSearch/mediaItemSearch";
import { MissingSeriesItemCard } from "#/features/screens/seriesDetails/components/MissingSeriesItemCard";
import type { MissingSeriesItem } from "#/features/screens/seriesDetails/seriesDetails";
import { MediaItemType } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

// MediaItemCard imports Link at module scope even though this card never links.
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("#/features/mediaItemSearch/mediaItemSearch", () => ({
	addToLibrary: vi.fn(),
}));

const toast = vi.fn();
vi.mock("#/components/hooks/useToast", () => ({
	useToast: () => ({ toast }),
}));

const addToLibraryMock = vi.mocked(addToLibrary);

function buildMissingItem(
	overrides: Partial<MissingSeriesItem> = {},
): MissingSeriesItem {
	return {
		externalId: "101",
		externalSource: "hardcover",
		type: MediaItemType.BOOK,
		title: "The Final Empire",
		description: "A thief tries to overthrow an immortal god-king.",
		coverImageUrl: "https://assets.hardcover.app/final-empire.jpg",
		releaseDate: "2006-01-01",
		metadata: { series: "Mistborn", author: "Brandon Sanderson" },
		...overrides,
	};
}

function renderCard(item: MissingSeriesItem = buildMissingItem()) {
	const onAdded = vi.fn();
	const renderResult = render(
		<MissingSeriesItemCard item={item} onAdded={onAdded} />,
	);
	return { ...renderResult, onAdded, item };
}

function getAddButton() {
	return screen.getByRole("button", { name: "search.addToLibrary" });
}

beforeEach(() => {
	vi.clearAllMocks();
	addToLibraryMock.mockResolvedValue({ mediaItemId: 7 });
});

afterEach(cleanup);

describe("MissingSeriesItemCard", () => {
	it("renders the item's artwork", () => {
		const { item } = renderCard();

		const cover = screen.getByRole("img");
		expect(cover).toHaveAttribute("src", item.coverImageUrl);
		expect(cover).toHaveAttribute("alt", item.title);
	});

	it("renders the title and the creator", () => {
		renderCard();

		expect(screen.getByText("The Final Empire")).toBeInTheDocument();
		expect(screen.getByText("Brandon Sanderson")).toBeInTheDocument();
	});

	it("omits the creator line when the metadata has none", () => {
		renderCard(buildMissingItem({ metadata: { series: "Mistborn" } }));

		expect(screen.queryByText("Brandon Sanderson")).not.toBeInTheDocument();
	});

	it("does not link to a details page", () => {
		renderCard();

		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});

	it("shows none of the badges the synthesized values would drive", () => {
		renderCard();

		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
		expect(screen.queryByTestId("purchased-badge")).not.toBeInTheDocument();
		expect(screen.queryByTestId("rating-stars")).not.toBeInTheDocument();
	});

	it("adds the item with its external fields when the button is clicked", async () => {
		const { item } = renderCard();

		fireEvent.click(getAddButton());

		await waitFor(() => {
			expect(addToLibraryMock).toHaveBeenCalledWith({
				data: {
					externalId: item.externalId,
					externalSource: item.externalSource,
					type: item.type,
					title: item.title,
					description: item.description,
					coverImageUrl: item.coverImageUrl,
					releaseDate: item.releaseDate,
					metadata: item.metadata,
				},
			});
		});
	});

	it("disables the button and shows the adding label while in flight", async () => {
		let resolveAdd: (value: { mediaItemId: number }) => void = () => {};
		addToLibraryMock.mockReturnValue(
			new Promise((resolve) => {
				resolveAdd = resolve;
			}),
		);

		renderCard();
		fireEvent.click(getAddButton());

		const addingButton = await screen.findByRole("button", {
			name: "search.adding",
		});
		expect(addingButton).toBeDisabled();

		resolveAdd({ mediaItemId: 7 });
	});

	it("reports the added item once the add resolves", async () => {
		const { onAdded, item } = renderCard();

		fireEvent.click(getAddButton());

		await waitFor(() => {
			expect(onAdded).toHaveBeenCalledWith(item);
		});
		expect(onAdded).toHaveBeenCalledTimes(1);
	});

	it("shows a destructive toast and stops showing the adding state when the add fails", async () => {
		addToLibraryMock.mockRejectedValue(new Error("Network error"));
		const { onAdded } = renderCard();

		fireEvent.click(getAddButton());

		await waitFor(() =>
			expect(toast).toHaveBeenCalledWith("seriesDetails.missingItemAddFailed", {
				variant: "destructive",
			}),
		);
		expect(onAdded).not.toHaveBeenCalled();
		expect(getAddButton()).not.toBeDisabled();
	});

	it("renders the placeholder when the item has no artwork", () => {
		renderCard(buildMissingItem({ coverImageUrl: undefined }));

		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		expect(screen.getByText("No Cover")).toBeInTheDocument();
	});
});
