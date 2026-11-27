import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import type { MediaItemDetails } from "../../../mediaItemDetails";
import { MediaItemDetailsHeaderCurrentInstance } from "../MediaItemDetailsHeaderCurrentInstance";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: vi.fn() }),
}));

vi.mock("#/features/screens/mediaItemDetails/mediaItemDetails", () => ({
	updateInstanceProgress: vi.fn().mockResolvedValue(undefined),
	updateMediaItemStatus: vi.fn().mockResolvedValue(null),
}));

vi.mock("#/components/hooks/useUserSettings", () => ({
	useUserSettings: () => ({ data: undefined }),
}));

type Instance = MediaItemDetails["instances"][number];

const baseInstance: Instance = {
	id: 1,
	rating: 0,
	fictionRating: null,
	seasonReviews: null,
	consumptionInfo: { method: "ebook" },
	reviewText: null,
	progressPercent: 42,
	startedAt: "2026-01-01",
	completedAt: null,
};

const baseProps: {
	mediaItemId: number;
	mediaItemType: MediaItemType;
	statusChangedAt: string | null;
	onReviewAndComplete: () => void;
} = {
	mediaItemId: 9,
	mediaItemType: MediaItemType.BOOK,
	statusChangedAt: null,
	onReviewAndComplete: vi.fn(),
};

function renderCurrentInstance(
	instanceOverrides: Partial<Instance> = {},
	propOverrides: Partial<typeof baseProps & { status: MediaItemStatus }> = {},
) {
	return render(
		<MediaItemDetailsHeaderCurrentInstance
			{...baseProps}
			{...propOverrides}
			instance={{ ...baseInstance, ...instanceOverrides }}
			status={propOverrides.status ?? MediaItemStatus.IN_PROGRESS}
		/>,
	);
}

afterEach(cleanup);

describe("MediaItemDetailsHeaderCurrentInstance", () => {
	it("shows the current status as a plain heading, not the shared status badge", () => {
		renderCurrentInstance({}, { status: MediaItemStatus.ON_HOLD });

		expect(
			screen.getByRole("heading", { name: "status.on_hold" }),
		).toBeInTheDocument();
		expect(screen.queryByTestId("status-badge")).not.toBeInTheDocument();
	});

	it("shows the started date and consumption method, but not a progress label, in the caption", () => {
		renderCurrentInstance({ startedAt: "2026-01-01" });

		expect(screen.getByText("Started Jan 01, 2026")).toBeInTheDocument();
		expect(screen.getByText("consumption.method.ebook")).toBeInTheDocument();
		expect(
			screen.queryByText("mediaItemDetails.progressComplete"),
		).not.toBeInTheDocument();
	});

	it("shows an editable progress field pre-filled with the current percent while in progress", () => {
		renderCurrentInstance({ progressPercent: 42 });

		expect(screen.getByLabelText("mediaItemDetails.progress")).toHaveValue(42);
	});

	it("shows a default platform and control method for a freshly-started game with no consumptionInfo yet", () => {
		renderCurrentInstance(
			{ consumptionInfo: null },
			{ mediaItemType: MediaItemType.VIDEO_GAME },
		);

		expect(
			screen.getByText(
				"consumption.gamePlatform.pc · consumption.controlMethod.controller",
			),
		).toBeInTheDocument();
	});

	it("shows the current page number (not raw percent) for a page-tracked physical book", () => {
		render(
			<MediaItemDetailsHeaderCurrentInstance
				{...baseProps}
				pageCount={146}
				instance={{
					...baseInstance,
					progressPercent: 74.6575,
					consumptionInfo: { method: "hardcover" },
				}}
				status={MediaItemStatus.IN_PROGRESS}
			/>,
		);

		expect(screen.getByLabelText("mediaItemDetails.page")).toHaveValue(109);
	});

	it("autosaves the new progress value on blur, touching only progress", async () => {
		const { updateInstanceProgress } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(updateInstanceProgress).mockClear();
		renderCurrentInstance({ progressPercent: 42 });

		fireEvent.change(screen.getByLabelText("mediaItemDetails.progress"), {
			target: { value: "55" },
		});
		fireEvent.blur(screen.getByLabelText("mediaItemDetails.progress"));

		await vi.waitFor(() =>
			expect(updateInstanceProgress).toHaveBeenCalledWith({
				data: {
					instanceId: 1,
					progressPercent: "55.0000",
					today: expect.any(String),
				},
			}),
		);
	});

	it("calls onReviewAndComplete when Review & Complete is clicked", () => {
		const onReviewAndComplete = vi.fn();
		renderCurrentInstance({}, { onReviewAndComplete });

		fireEvent.click(screen.getByText("mediaItemDetails.reviewAndComplete"));

		expect(onReviewAndComplete).toHaveBeenCalledTimes(1);
	});

	it("puts the item on hold when On Hold is clicked, with no dialog", async () => {
		const { updateMediaItemStatus } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(updateMediaItemStatus).mockClear();
		renderCurrentInstance();

		fireEvent.click(screen.getByText("status.on_hold"));

		await vi.waitFor(() =>
			expect(updateMediaItemStatus).toHaveBeenCalledWith({
				data: expect.objectContaining({
					mediaItemId: 9,
					status: MediaItemStatus.ON_HOLD,
				}),
			}),
		);
		expect(
			screen.queryByText("mediaItemDetails.setOtherStatus"),
		).not.toBeInTheDocument();
	});

	it("shows a low-emphasis Drop action alongside Review & Complete and On Hold while in progress", () => {
		renderCurrentInstance();

		expect(
			screen.getByText("mediaItemDetails.markAsDropped"),
		).toBeInTheDocument();
	});

	it("drops the item when the tertiary Drop action is clicked", async () => {
		const { updateMediaItemStatus } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(updateMediaItemStatus).mockClear();
		renderCurrentInstance();

		fireEvent.click(screen.getByText("mediaItemDetails.markAsDropped"));

		await vi.waitFor(() =>
			expect(updateMediaItemStatus).toHaveBeenCalledWith({
				data: expect.objectContaining({
					mediaItemId: 9,
					status: MediaItemStatus.DROPPED,
				}),
			}),
		);
	});

	it("shows 'On Hold since', a Resume action, and a Drop secondary action, with no editable progress field, while on hold", () => {
		renderCurrentInstance(
			{ startedAt: "2026-01-01", progressPercent: 42 },
			{ status: MediaItemStatus.ON_HOLD, statusChangedAt: "2026-02-10" },
		);

		expect(
			screen.getByText("mediaItemDetails.onHoldSince"),
		).toBeInTheDocument();
		expect(
			screen.queryByLabelText("mediaItemDetails.progress"),
		).not.toBeInTheDocument();
		expect(screen.getByText("mediaItemDetails.resume")).toBeInTheDocument();
		expect(
			screen.queryByText("mediaItemDetails.reviewAndComplete"),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: "status.on_hold" }),
		).not.toBeInTheDocument();
		const dropButton = screen.getByText("mediaItemDetails.markAsDropped");
		expect(dropButton).toBeInTheDocument();
		expect(dropButton).toHaveAttribute("data-variant", "outline");
	});

	it("drops the item when Drop is clicked while on hold", async () => {
		const { updateMediaItemStatus } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(updateMediaItemStatus).mockClear();
		renderCurrentInstance(
			{},
			{ status: MediaItemStatus.ON_HOLD, statusChangedAt: "2026-02-10" },
		);

		fireEvent.click(screen.getByText("mediaItemDetails.markAsDropped"));

		await vi.waitFor(() =>
			expect(updateMediaItemStatus).toHaveBeenCalledWith({
				data: expect.objectContaining({
					mediaItemId: 9,
					status: MediaItemStatus.DROPPED,
				}),
			}),
		);
	});

	it("resumes the item when Resume is clicked while dropped, with no Drop action shown", async () => {
		const { updateMediaItemStatus } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(updateMediaItemStatus).mockClear();
		renderCurrentInstance(
			{},
			{ status: MediaItemStatus.DROPPED, statusChangedAt: "2026-03-05" },
		);

		expect(
			screen.queryByText("mediaItemDetails.markAsDropped"),
		).not.toBeInTheDocument();

		fireEvent.click(screen.getByText("mediaItemDetails.resume"));

		await vi.waitFor(() =>
			expect(updateMediaItemStatus).toHaveBeenCalledWith({
				data: expect.objectContaining({
					mediaItemId: 9,
					status: MediaItemStatus.IN_PROGRESS,
				}),
			}),
		);
	});
});
