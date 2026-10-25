import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaItemStatus, MediaItemType } from "#/lib/enums";
import type { MediaItemDetails } from "../../../mediaItemDetails";
import { MediaItemDetailsHeaderCurrentInstance } from "../MediaItemDetailsHeaderCurrentInstance";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

type Instance = MediaItemDetails["instances"][number];

const baseInstance: Instance = {
	id: 1,
	rating: 0,
	fictionRating: null,
	seasonReviews: null,
	consumptionInfo: null,
	reviewText: null,
	progressPercent: null,
	startedAt: "2026-01-01",
	completedAt: null,
};

function renderCurrentInstance(
	instanceOverrides: Partial<Instance> = {},
	onClick = vi.fn(),
	statusOverrides: {
		status?: MediaItemStatus;
		statusChangedAt?: string | null;
	} = {},
) {
	return render(
		<MediaItemDetailsHeaderCurrentInstance
			instance={{ ...baseInstance, ...instanceOverrides }}
			mediaItemType={MediaItemType.BOOK}
			status={statusOverrides.status ?? MediaItemStatus.IN_PROGRESS}
			statusChangedAt={statusOverrides.statusChangedAt ?? null}
			onClick={onClick}
		/>,
	);
}

afterEach(cleanup);

describe("MediaItemDetailsHeaderCurrentInstance", () => {
	it("shows the started date, progress percentage, and consumption method", () => {
		renderCurrentInstance({
			startedAt: "2026-01-01",
			progressPercent: 42,
			consumptionInfo: { method: "ebook" },
		});

		expect(screen.getByText("Started Jan 01, 2026")).toBeInTheDocument();
		expect(
			screen.getByText("mediaItemDetails.progressComplete"),
		).toBeInTheDocument();
		expect(screen.getByText("consumption.method.ebook")).toBeInTheDocument();
	});

	it("shows only the started date when progress and consumption are unset", () => {
		renderCurrentInstance({
			startedAt: "2026-01-01",
			progressPercent: null,
			consumptionInfo: null,
		});

		expect(screen.getByText("Started Jan 01, 2026")).toBeInTheDocument();
		expect(
			screen.queryByText("mediaItemDetails.progressComplete"),
		).not.toBeInTheDocument();
	});

	it("shows a · separator between each of the three meta labels", () => {
		renderCurrentInstance({
			startedAt: "2026-01-01",
			progressPercent: 42,
			consumptionInfo: { method: "ebook" },
		});

		expect(screen.getAllByText("·")).toHaveLength(2);
	});

	it("renders a thinner progress bar than the default", () => {
		renderCurrentInstance({ progressPercent: 42 });

		expect(screen.getByRole("progressbar")).toHaveClass("h-1", {
			exact: false,
		});
		expect(screen.getByRole("progressbar")).not.toHaveClass("h-2.5");
	});

	it("uses theme-aware colors instead of hardcoded white ones", () => {
		renderCurrentInstance();

		const button = screen.getByRole("button");
		expect(button).toHaveClass(
			"text-foreground",
			"border-border",
			"bg-accent/50",
		);
		expect(button).not.toHaveClass(
			"text-white",
			"border-white/20",
			"bg-white/10",
			"hover:bg-white/15",
		);
	});

	it("calls onClick when clicked", () => {
		const onClick = vi.fn();
		renderCurrentInstance({}, onClick);

		fireEvent.click(screen.getByRole("button"));

		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("has the Update Progress accessible name", () => {
		renderCurrentInstance();

		expect(
			screen.getByRole("button", { name: "mediaItemDetails.updateProgress" }),
		).toBeInTheDocument();
	});

	it("shows 'On Hold since' instead of the started date while on hold", () => {
		renderCurrentInstance({ startedAt: "2026-01-01" }, undefined, {
			status: MediaItemStatus.ON_HOLD,
			statusChangedAt: "2026-02-10",
		});

		expect(
			screen.getByText("mediaItemDetails.onHoldSince"),
		).toBeInTheDocument();
		expect(screen.queryByText("Started Jan 01, 2026")).not.toBeInTheDocument();
	});

	it("omits the date segment while on hold when statusChangedAt is unknown", () => {
		renderCurrentInstance({ startedAt: "2026-01-01" }, undefined, {
			status: MediaItemStatus.ON_HOLD,
			statusChangedAt: null,
		});

		expect(
			screen.queryByText("mediaItemDetails.onHoldSince"),
		).not.toBeInTheDocument();
		expect(screen.queryByText("Started Jan 01, 2026")).not.toBeInTheDocument();
	});

	it("still renders the progress bar while on hold", () => {
		renderCurrentInstance({ progressPercent: 42 }, undefined, {
			status: MediaItemStatus.ON_HOLD,
			statusChangedAt: "2026-02-10",
		});

		expect(screen.getByRole("progressbar")).toBeInTheDocument();
	});

	it("shows 'Dropped on' and the frozen progress percentage when dropped", () => {
		renderCurrentInstance(
			{ startedAt: "2026-01-01", progressPercent: 50 },
			undefined,
			{ status: MediaItemStatus.DROPPED, statusChangedAt: "2026-03-05" },
		);

		expect(screen.getByText("mediaItemDetails.droppedOn")).toBeInTheDocument();
		expect(
			screen.getByText("mediaItemDetails.progressComplete"),
		).toBeInTheDocument();
		expect(screen.queryByText("Started Jan 01, 2026")).not.toBeInTheDocument();
	});
});
