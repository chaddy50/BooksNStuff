import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExternalSearchResult } from "#/features/mediaItemSearch/api/types";
import { PodcastArcPickerDialog } from "#/features/mediaItemSearch/components/PodcastArcPickerDialog";
import { MediaItemType } from "#/lib/enums";

const { translate } = vi.hoisted(() => ({ translate: (key: string) => key }));
vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: translate }),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
}));

vi.mock("#/features/mediaItemSearch/mediaItemSearch", () => ({
	addPodcastArc: vi.fn(),
	fetchEpisodesForFeed: vi.fn().mockResolvedValue([]),
}));

const toast = vi.fn();
vi.mock("#/components/hooks/useToast", () => ({
	useToast: () => ({ toast }),
}));

const podcast = {
	title: "Test Podcast",
	metadata: { feedUrl: "https://example.com/feed.xml" },
} as unknown as ExternalSearchResult;

const episode = {
	guid: "episode-1",
	title: "Episode One",
	episodeNumber: 1,
	durationMinutes: 30,
	publishedAt: "2026-01-01",
};

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

async function openDialogWithOneEpisodeSelected(onClose: () => void) {
	const { fetchEpisodesForFeed } = await import(
		"#/features/mediaItemSearch/mediaItemSearch"
	);
	vi.mocked(fetchEpisodesForFeed).mockResolvedValue([episode]);

	render(
		<PodcastArcPickerDialog
			mode="add"
			podcast={podcast}
			isOpen
			onClose={onClose}
		/>,
	);

	fireEvent.click(await screen.findByText("1. Episode One"));
}

describe("PodcastArcPickerDialog", () => {
	it("gives the dialog an accessible description", () => {
		render(
			<PodcastArcPickerDialog
				mode="add"
				podcast={{
					externalId: "1",
					externalSource: "itunes",
					type: MediaItemType.PODCAST,
					title: "Hardcore History",
					metadata: { feedUrl: "https://example.com/feed.xml" },
				}}
				isOpen
				onClose={vi.fn()}
			/>,
		);

		expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
			"podcast.arcPickerDescription",
		);
	});

	it("shows a destructive toast with the add-arc error and stays open when addPodcastArc rejects", async () => {
		const { addPodcastArc } = await import(
			"#/features/mediaItemSearch/mediaItemSearch"
		);
		vi.mocked(addPodcastArc).mockRejectedValue(new Error("network down"));
		const onClose = vi.fn();

		await openDialogWithOneEpisodeSelected(onClose);

		fireEvent.click(
			screen.getByRole("button", { name: "search.addToLibrary" }),
		);

		await waitFor(() =>
			expect(toast).toHaveBeenCalledWith("podcast.addArcError", {
				variant: "destructive",
			}),
		);
		expect(onClose).not.toHaveBeenCalled();
	});
});
