import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "#/components/ui/tooltip";
import { MediaItemType } from "#/lib/enums";
import { MediaItemDetailsHeader } from "../MediaItemDetailsHeader";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const { invalidate } = vi.hoisted(() => ({ invalidate: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate }),
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
	"#/features/screens/mediaItemDetails/mediaItemDetails",
	async (importOriginal) => ({
		...(await importOriginal()),
		updateMediaItemStatus: vi.fn(),
	}),
);

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

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

function renderMediaItemDetailsHeader(
	props: Partial<Parameters<typeof MediaItemDetailsHeader>[0]> = {},
) {
	return render(
		<TooltipProvider>
			<MediaItemDetailsHeader
				mediaItemDetails={makeMediaItemDetails()}
				onUpdateProgress={vi.fn()}
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

	it("hides the status and purchase status controls when an instance is in progress", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				instances: [
					{ id: 99, rating: 0, startedAt: "2026-01-01", completedAt: null },
				],
			}),
		});

		expect(screen.queryAllByRole("combobox")).toHaveLength(0);
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

	it("hides the per-type start button when an instance is in progress", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				type: MediaItemType.BOOK,
				instances: [
					{ id: 99, rating: 0, startedAt: "2026-01-01", completedAt: null },
				],
			}),
		});

		expect(
			screen.queryByRole("button", { name: "mediaItemDetails.startReading" }),
		).not.toBeInTheDocument();
	});

	it("starts progress immediately when the start button is clicked, without opening the editor", async () => {
		const { updateMediaItemStatus } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		const onUpdateProgress = vi.fn();
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({ id: 7 }),
			onUpdateProgress,
		});

		fireEvent.click(
			screen.getByRole("button", { name: "mediaItemDetails.startReading" }),
		);

		await vi.waitFor(() =>
			expect(updateMediaItemStatus).toHaveBeenCalledWith({
				data: { mediaItemId: 7, status: "in_progress" },
			}),
		);
		expect(invalidate).toHaveBeenCalledTimes(1);
		expect(onUpdateProgress).not.toHaveBeenCalled();
	});

	it("calls onUpdateProgress with the unfinished instance's id when its summary is clicked", () => {
		const onUpdateProgress = vi.fn();
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				instances: [
					{ id: 99, rating: 0, startedAt: "2026-01-01", completedAt: null },
				],
			}),
			onUpdateProgress,
		});

		fireEvent.click(
			screen.getByRole("button", { name: "mediaItemDetails.updateProgress" }),
		);

		expect(onUpdateProgress).toHaveBeenCalledWith(99);
	});

	it("shows a rating when the most recently rated instance has one", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				instances: [{ id: 1, rating: 4, startedAt: null, completedAt: null }],
			}),
		});

		expect(screen.getByTestId("rating-stars")).toBeInTheDocument();
	});

	it("uses theme-aware star colors instead of a hardcoded dark-background color", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				instances: [{ id: 1, rating: 4, startedAt: null, completedAt: null }],
			}),
		});

		const [filledStar] = screen.getAllByTestId("rating-star");
		expect(filledStar.querySelector("svg")).toHaveClass("text-yellow-800");
		expect(filledStar.querySelector("svg")).not.toHaveClass("text-yellow-300");
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

	it("shows the genre and release year on the same line as the type badge, below the title", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				releaseDate: "2019-01-01",
				genreId: 3,
				genreName: "Sci-Fi",
			}),
		});

		expect(screen.getByText("Sci-Fi")).toBeInTheDocument();
		expect(screen.getByText("2019")).toBeInTheDocument();

		const subline = screen.getByTestId("media-item-details-header-subline");
		const typeBadge = screen.getByTestId("type-badge");
		const heading = screen.getByRole("heading", {
			name: "A Memory Called Empire",
		});

		expect(subline.parentElement).toBe(typeBadge.parentElement);
		expect(typeBadge.parentElement).not.toBe(heading.parentElement);
	});

	it("shows the creator and series on their own line below the title", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				metadata: { author: "Arkady Martine", seriesBookNumber: "1" },
				seriesId: 5,
				seriesName: "Teixcalaan",
				creatorId: 9,
				creatorName: "Arkady Martine",
			}),
		});

		expect(screen.getByText("Arkady Martine")).toBeInTheDocument();
		expect(screen.getByText("Teixcalaan #1")).toBeInTheDocument();

		const creatorLine = screen.getByTestId(
			"media-item-details-header-creator-line",
		);
		const typeBadge = screen.getByTestId("type-badge");
		expect(creatorLine.parentElement).not.toBe(typeBadge.parentElement);
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
