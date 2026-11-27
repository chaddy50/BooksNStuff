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
		updateInstanceProgress: vi.fn(),
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

vi.mock("#/components/hooks/useUserSettings", () => ({
	useUserSettings: () => ({ data: undefined }),
}));

let isMobile = false;

vi.mock("#/components/hooks/useIsMobile", () => ({
	useIsMobile: () => isMobile,
}));

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
	isMobile = false;
});

function makeEditorState(
	overrides: Partial<
		Parameters<typeof MediaItemDetailsHeader>[0]["editorState"]
	> = {},
): Parameters<typeof MediaItemDetailsHeader>[0]["editorState"] {
	return {
		modalState: null,
		editorRef: { current: null },
		guard: {
			isPrompting: false,
			isSaving: false,
			startEditing: vi.fn(),
			keepEditing: vi.fn(),
			discard: vi.fn(),
			saveAndContinue: vi.fn(),
		},
		openReviewAndComplete: vi.fn(),
		openEditInstance: vi.fn(),
		closeModal: vi.fn(),
		...overrides,
	} as unknown as Parameters<typeof MediaItemDetailsHeader>[0]["editorState"];
}

function renderMediaItemDetailsHeader(
	props: Partial<Parameters<typeof MediaItemDetailsHeader>[0]> = {},
) {
	return render(
		<TooltipProvider>
			<MediaItemDetailsHeader
				mediaItemDetails={makeMediaItemDetails()}
				editorState={makeEditorState()}
				onSeriesCompletionNeeded={vi.fn()}
				onRequestDelete={vi.fn()}
				isDeleting={false}
				{...props}
			/>
		</TooltipProvider>,
	);
}

describe("MediaItemDetailsHeader", () => {
	it("places the current instance info inside the identity column on desktop", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({ type: MediaItemType.BOOK }),
		});

		const identityColumn = screen.getByTestId(
			"media-item-details-identity-column",
		);
		expect(identityColumn).toContainElement(
			screen.getByRole("button", { name: "mediaItemDetails.startReading" }),
		);
	});

	it("places the current instance info outside the identity column on mobile", () => {
		isMobile = true;
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({ type: MediaItemType.BOOK }),
		});

		const identityColumn = screen.getByTestId(
			"media-item-details-identity-column",
		);
		expect(identityColumn).not.toContainElement(
			screen.getByRole("button", { name: "mediaItemDetails.startReading" }),
		);
	});

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

	it("shows the Review & Complete action when an instance is in progress", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				type: MediaItemType.BOOK,
				instances: [
					{ id: 1, rating: 0, startedAt: "2026-01-01", completedAt: null },
				],
			}),
		});

		expect(
			screen.getByText("mediaItemDetails.reviewAndComplete"),
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

	it("starts progress immediately when the start button is clicked, without opening a modal", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2024-05-15T12:00:00"));
		try {
			const { updateMediaItemStatus } = await import(
				"#/features/screens/mediaItemDetails/mediaItemDetails"
			);
			const openReviewAndComplete = vi.fn();
			renderMediaItemDetailsHeader({
				mediaItemDetails: makeMediaItemDetails({ id: 7 }),
				editorState: makeEditorState({ openReviewAndComplete }),
			});

			fireEvent.click(
				screen.getByRole("button", { name: "mediaItemDetails.startReading" }),
			);

			await vi.waitFor(() =>
				expect(updateMediaItemStatus).toHaveBeenCalledWith({
					data: { mediaItemId: 7, status: "in_progress", today: "2024-05-15" },
				}),
			);
			expect(invalidate).toHaveBeenCalledTimes(1);
			expect(openReviewAndComplete).not.toHaveBeenCalled();
		} finally {
			vi.useRealTimers();
		}
	});

	it("opens Review & Complete via the editor state when that action is clicked", () => {
		const openReviewAndComplete = vi.fn();
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				instances: [
					{ id: 99, rating: 0, startedAt: "2026-01-01", completedAt: null },
				],
			}),
			editorState: makeEditorState({ openReviewAndComplete }),
		});

		fireEvent.click(screen.getByText("mediaItemDetails.reviewAndComplete"));

		expect(openReviewAndComplete).toHaveBeenCalledTimes(1);
	});

	it("shows the frozen progress bar at the bottom of the card when there's an unfinished instance", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				instances: [
					{
						id: 99,
						rating: 0,
						startedAt: "2026-01-01",
						completedAt: null,
						progressPercent: 42,
					},
				],
			}),
		});

		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("omits the progress bar when there's no unfinished instance", () => {
		renderMediaItemDetailsHeader();

		expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
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

	it("attaches the type badge to the end of the title text, with creator/series on their own line below", () => {
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

		const metaList = screen.getByTestId("media-item-details-header-meta-list");
		const typeBadge = screen.getByTestId("type-badge");
		const heading = screen.getByRole("heading", {
			name: "A Memory Called Empire",
		});

		expect(typeBadge.parentElement).toBe(heading);
		expect(metaList.parentElement).not.toBe(heading);
	});

	it("shows only the start button and status/purchase controls when there are no instances at all", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				status: "waiting_for_next_release",
				instances: [],
			}),
		});

		expect(
			screen.getByRole("button", { name: "mediaItemDetails.startReading" }),
		).toBeInTheDocument();
		expect(screen.queryByTestId("rating-stars")).not.toBeInTheDocument();
		expect(screen.getAllByRole("combobox")).toHaveLength(2);
	});

	it("hides the status and purchase status controls, and shows a Next Up secondary action, for a backlog item", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				status: "backlog",
				instances: [],
			}),
		});

		expect(screen.queryAllByRole("combobox")).toHaveLength(0);
		expect(
			screen.getByRole("button", { name: "mediaItemDetails.startReading" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "status.next_up" }),
		).toBeInTheDocument();
		expect(screen.queryByText("status.backlog")).not.toBeInTheDocument();
	});

	it("shows the status as a heading for every status except backlog", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				status: "next_up",
				instances: [],
			}),
		});
		expect(
			screen.getByRole("heading", { name: "status.next_up" }),
		).toBeInTheDocument();
		cleanup();

		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				status: "waiting_for_next_release",
				instances: [],
			}),
		});
		expect(
			screen.getByRole("heading", { name: "status.waiting_for_next_release" }),
		).toBeInTheDocument();
		cleanup();

		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				status: "done",
				instances: [],
			}),
		});
		expect(
			screen.getByRole("heading", { name: "status.done" }),
		).toBeInTheDocument();
		cleanup();

		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				status: "backlog",
				instances: [],
			}),
		});
		expect(
			screen.queryByRole("heading", { name: "status.backlog" }),
		).not.toBeInTheDocument();
	});

	it("moves a backlog item to Next Up when the secondary action is clicked", async () => {
		const { updateMediaItemStatus } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(updateMediaItemStatus).mockClear();
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				id: 7,
				status: "backlog",
				instances: [],
			}),
		});

		fireEvent.click(screen.getByRole("button", { name: "status.next_up" }));

		await vi.waitFor(() =>
			expect(updateMediaItemStatus).toHaveBeenCalledWith({
				data: expect.objectContaining({
					mediaItemId: 7,
					status: "next_up",
				}),
			}),
		);
	});

	it("hides the status and purchase status controls, and shows a Backlog secondary action, for a next-up item", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				status: "next_up",
				instances: [],
			}),
		});

		expect(screen.queryAllByRole("combobox")).toHaveLength(0);
		expect(
			screen.getByRole("button", { name: "mediaItemDetails.startReading" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "status.backlog" }),
		).toBeInTheDocument();
	});

	it("moves a next-up item to Backlog when the secondary action is clicked", async () => {
		const { updateMediaItemStatus } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(updateMediaItemStatus).mockClear();
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				id: 7,
				status: "next_up",
				instances: [],
			}),
		});

		fireEvent.click(screen.getByRole("button", { name: "status.backlog" }));

		await vi.waitFor(() =>
			expect(updateMediaItemStatus).toHaveBeenCalledWith({
				data: expect.objectContaining({
					mediaItemId: 7,
					status: "backlog",
				}),
			}),
		);
	});

	it("does not show the Next Up secondary action for a non-backlog item with no instances", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				status: "done",
				instances: [],
			}),
		});

		expect(
			screen.queryByRole("button", { name: "status.next_up" }),
		).not.toBeInTheDocument();
	});

	it("shows the most recent rating, a last-read caption, and a type-specific reread button when the item is done, with no status/purchase controls", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				status: "done",
				type: MediaItemType.BOOK,
				instances: [
					{
						id: 1,
						rating: 5,
						startedAt: "2026-01-01",
						completedAt: "2026-01-10",
					},
				],
			}),
		});

		const ratingStars = screen.getByTestId("rating-stars");
		const lastReadCaption = screen.getByText("mediaItemDetails.lastRead");
		expect(ratingStars.parentElement).toContainElement(lastReadCaption);
		expect(
			screen.getByRole("button", { name: "mediaItemDetails.reread" }),
		).toBeInTheDocument();
		expect(screen.queryAllByRole("combobox")).toHaveLength(0);
	});

	it("shows a Next Up secondary action for a waiting-for-next-release item, without hiding status/purchase controls", () => {
		renderMediaItemDetailsHeader({
			mediaItemDetails: makeMediaItemDetails({
				status: "waiting_for_next_release",
				instances: [],
			}),
		});

		expect(
			screen.getByRole("button", { name: "mediaItemDetails.startReading" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "status.next_up" }),
		).toBeInTheDocument();
		expect(screen.getAllByRole("combobox")).toHaveLength(2);
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
