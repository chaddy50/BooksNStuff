import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/lib/enums";
import { EditMetadataDialog } from "../EditMetadataDialog";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: vi.fn() }),
}));

vi.mock("#/features/screens/mediaItemDetails/mediaItemDetails", () => ({
	updateMediaItemMetadata: vi.fn().mockResolvedValue(undefined),
	updateMediaItemSeries: vi.fn().mockResolvedValue(undefined),
	updateMediaItemCreator: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("#/lib/genres/genres", () => ({
	saveMediaItemGenre: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("#/lib/tags", () => ({
	saveMediaItemTags: vi.fn().mockResolvedValue(undefined),
}));

const toast = vi.fn();
vi.mock("#/components/hooks/useToast", () => ({
	useToast: () => ({ toast }),
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

const baseMediaItemDetails = {
	id: 1,
	title: "A Memory Called Empire",
	description: null,
	coverImageUrl: null,
	releaseDate: null,
	metadata: null,
	type: MediaItemType.BOOK,
	status: "backlog",
	purchaseStatus: "not_purchased",
	seriesId: null,
	seriesName: null,
	creatorId: null,
	creatorName: null,
	genreId: null,
	genreName: null,
	tags: [],
	instances: [],
} as unknown as Parameters<typeof EditMetadataDialog>[0]["mediaItemDetails"];

const mediaItemDetails = baseMediaItemDetails;

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("EditMetadataDialog", () => {
	it("shows an Edit trigger with an accessible name", () => {
		render(
			<EditMetadataDialog
				mediaItemDetails={mediaItemDetails}
				onSeriesCompletionNeeded={vi.fn()}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "mediaItemDetails.edit" }),
		).toBeInTheDocument();
	});

	it("opens the edit dialog when the trigger is clicked", () => {
		render(
			<EditMetadataDialog
				mediaItemDetails={mediaItemDetails}
				onSeriesCompletionNeeded={vi.fn()}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: "mediaItemDetails.edit" }),
		);

		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});

	it("always includes status and purchase status fields", () => {
		render(
			<EditMetadataDialog
				mediaItemDetails={mediaItemDetails}
				onSeriesCompletionNeeded={vi.fn()}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: "mediaItemDetails.edit" }),
		);

		expect(screen.getAllByRole("combobox")).toHaveLength(2);
	});

	it("uses a theme-aware icon color so the trigger stays visible in light mode", () => {
		render(
			<EditMetadataDialog
				mediaItemDetails={mediaItemDetails}
				onSeriesCompletionNeeded={vi.fn()}
			/>,
		);

		const trigger = screen.getByRole("button", {
			name: "mediaItemDetails.edit",
		});

		expect(trigger.className).not.toContain("text-white");
		expect(trigger.className).toContain("text-muted-foreground");
	});

	it("gives the dialog an accessible description", () => {
		render(
			<EditMetadataDialog
				mediaItemDetails={mediaItemDetails}
				onSeriesCompletionNeeded={vi.fn()}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: "mediaItemDetails.edit" }),
		);

		expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
			"mediaItemDetails.editMetadataDescription",
		);
	});

	it("shows a destructive toast with the failure message and stays open when a chained update rejects", async () => {
		const { updateMediaItemMetadata } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(updateMediaItemMetadata).mockRejectedValueOnce(
			new Error("Title is required."),
		);

		render(
			<EditMetadataDialog
				mediaItemDetails={mediaItemDetails}
				onSeriesCompletionNeeded={vi.fn()}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: "mediaItemDetails.edit" }),
		);
		fireEvent.click(screen.getByText("common.save"));

		await waitFor(() =>
			expect(toast).toHaveBeenCalledWith("Title is required.", {
				variant: "destructive",
			}),
		);
		expect(screen.getByRole("dialog")).toBeInTheDocument();
	});
});
