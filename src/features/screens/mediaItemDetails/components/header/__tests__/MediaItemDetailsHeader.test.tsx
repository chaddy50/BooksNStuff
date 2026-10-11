import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "#/components/ui/tooltip";
import { MediaItemType } from "#/lib/enums";
import { MediaItemDetailsHeader } from "../MediaItemDetailsHeader";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: vi.fn() }),
	Link: ({
		to,
		params,
		children,
	}: {
		to: string;
		params: Record<string, string>;
		children: React.ReactNode;
	}) => (
		<a href={to.replace(/\$(\w+)/g, (_, name) => params[name])}>{children}</a>
	),
}));

vi.mock(
	"#/features/screens/mediaItemDetails/components/metadata/components/EditMetadataDialog",
	() => ({
		EditMetadataDialog: () => (
			<button type="button">mediaItemDetails.edit</button>
		),
	}),
);

function makeMediaItemDetails(
	overrides: Record<string, unknown> = {},
): Parameters<typeof MediaItemDetailsHeader>[0]["mediaItemDetails"] {
	return {
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
		instances: [],
		relatedItems: [],
		...overrides,
	} as unknown as Parameters<
		typeof MediaItemDetailsHeader
	>[0]["mediaItemDetails"];
}

afterEach(cleanup);

function renderMediaItemDetailsHeader(
	props: Partial<Parameters<typeof MediaItemDetailsHeader>[0]> = {},
) {
	return render(
		<TooltipProvider>
			<MediaItemDetailsHeader
				mediaItemDetails={makeMediaItemDetails()}
				onLogProgress={vi.fn()}
				{...props}
			/>
		</TooltipProvider>,
	);
}

describe("MediaItemDetailsHeader", () => {
	it("renders both the status and purchase status controls", () => {
		renderMediaItemDetailsHeader();

		expect(screen.getAllByRole("combobox")).toHaveLength(2);
	});

	it("renders the title and an Edit button", () => {
		renderMediaItemDetailsHeader();

		expect(
			screen.getByRole("heading", { name: "A Memory Called Empire" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "mediaItemDetails.edit" }),
		).toBeInTheDocument();
	});

	it("labels the log progress button per type when there is no unfinished instance", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({ type: MediaItemType.BOOK }),
		});
		expect(
			screen.getByRole("button", { name: "mediaItemDetails.startReading" }),
		).toBeInTheDocument();
		cleanup();

		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({ type: MediaItemType.MOVIE }),
		});
		expect(
			screen.getByRole("button", { name: "mediaItemDetails.startWatching" }),
		).toBeInTheDocument();
		cleanup();

		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({ type: MediaItemType.PODCAST }),
		});
		expect(
			screen.getByRole("button", { name: "mediaItemDetails.startListening" }),
		).toBeInTheDocument();
		cleanup();

		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				type: MediaItemType.VIDEO_GAME,
			}),
		});
		expect(
			screen.getByRole("button", { name: "mediaItemDetails.startPlaying" }),
		).toBeInTheDocument();
	});

	it("labels the log progress button Update Progress when an instance is in progress", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				type: MediaItemType.BOOK,
				instances: [
					{ id: 1, rating: 0, startedAt: "2026-01-01", completedAt: null },
				],
			}),
		});

		expect(
			screen.getByRole("button", { name: "mediaItemDetails.updateProgress" }),
		).toBeInTheDocument();
	});

	it("calls onLogProgress when the log progress button is clicked", () => {
		const onLogProgress = vi.fn();
		renderMediaItemDetailsHeader({ onLogProgress });

		fireEvent.click(
			screen.getByRole("button", { name: "mediaItemDetails.startReading" }),
		);

		expect(onLogProgress).toHaveBeenCalledTimes(1);
	});

	it("shows a rating when the most recently rated instance has one", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				instances: [{ id: 1, rating: 4, startedAt: null, completedAt: null }],
			}),
		});

		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
	});

	it("omits the rating when no instance has one", () => {
		renderMediaItemDetailsHeader();

		expect(screen.queryByTestId("rating-stars")).not.toBeInTheDocument();
	});

	it("puts the rating on its own row above status and purchase status", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				instances: [{ id: 1, rating: 4, startedAt: null, completedAt: null }],
			}),
		});

		const rating = screen.getByTestId("rating-stars");
		const [statusCombobox] = screen.getAllByRole("combobox");

		expect(rating.parentElement).not.toBe(
			statusCombobox.closest("button")?.parentElement,
		);
		expect(
			rating.compareDocumentPosition(statusCombobox) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("shows the creator, series, and release year on the same line as the type badge", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				metadata: { author: "Arkady Martine", seriesBookNumber: "1" },
				releaseDate: "2019-01-01",
				seriesId: 5,
				seriesName: "Teixcalaan",
				creatorId: 9,
				creatorName: "Arkady Martine",
			}),
		});

		expect(screen.getByText("Arkady Martine")).toBeInTheDocument();
		expect(screen.getByText("Teixcalaan #1")).toBeInTheDocument();
		expect(screen.getByText("2019")).toBeInTheDocument();

		const subline = screen.getByTestId("media-item-details-header-subline");
		const typeBadge = screen.getByTestId("type-badge");
		expect(subline.parentElement).toBe(typeBadge.parentElement?.parentElement);
	});

	it("shows the item's tags on their own line", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({ tags: ["favorite", "cozy"] }),
		});

		expect(screen.getByText("favorite")).toBeInTheDocument();
		expect(screen.getByText("cozy")).toBeInTheDocument();
	});

	it("omits the tags row when there are no tags", () => {
		renderMediaItemDetailsHeader();

		expect(
			screen.queryByTestId("media-item-details-header-tags"),
		).not.toBeInTheDocument();
	});
});
