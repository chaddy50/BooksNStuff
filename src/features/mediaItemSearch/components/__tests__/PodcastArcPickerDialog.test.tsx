import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PodcastArcPickerDialog } from "#/features/mediaItemSearch/components/PodcastArcPickerDialog";
import { MediaItemType } from "#/lib/enums";

const translate = (key: string) => key;
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

afterEach(cleanup);

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
});
