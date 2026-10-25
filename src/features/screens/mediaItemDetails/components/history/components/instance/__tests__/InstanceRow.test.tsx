import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "#/components/ui/tooltip";
import type { FictionRating } from "#/database/schema";
import { InstanceRow } from "#/features/screens/mediaItemDetails/components/history/components/instance/InstanceRow";
import {
	getConsumptionLabel,
	getProgressLabel,
} from "#/features/screens/mediaItemDetails/instanceMetaLabels";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemStatus } from "#/lib/enums";

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
	startedAt: null,
	completedAt: null,
};

function renderInstanceRow(
	instanceOverrides: Partial<Instance> = {},
	statusOverrides: {
		status?: MediaItemStatus;
		statusChangedAt?: string | null;
	} = {},
) {
	return render(
		<TooltipProvider>
			<InstanceRow
				index={1}
				instance={{ ...baseInstance, ...instanceOverrides }}
				status={statusOverrides.status ?? MediaItemStatus.IN_PROGRESS}
				statusChangedAt={statusOverrides.statusChangedAt ?? null}
				onEdit={vi.fn()}
			/>
		</TooltipProvider>,
	);
}

const t = (key: string) => key;

afterEach(cleanup);

describe("getConsumptionLabel", () => {
	it("returns null when consumptionInfo is null", () => {
		expect(getConsumptionLabel(null, t)).toBeNull();
	});

	it("returns the translated method for method-based consumption", () => {
		expect(getConsumptionLabel({ method: "ebook" }, t)).toBe(
			"consumption.method.ebook",
		);
	});

	it("returns translated platform and translated control method joined with ·", () => {
		expect(
			getConsumptionLabel({ method: "ps5", controlMethod: "controller" }, t),
		).toBe(
			"consumption.gamePlatform.ps5 · consumption.controlMethod.controller",
		);
	});
});

describe("getProgressLabel", () => {
	const tWithOptions = (key: string, options?: Record<string, unknown>) =>
		options ? `${key}:${JSON.stringify(options)}` : key;

	it("returns null when progressPercent is null", () => {
		expect(getProgressLabel(null, null, tWithOptions)).toBeNull();
	});

	it("rounds a fractional percent for display", () => {
		expect(getProgressLabel(46.875, null, tWithOptions)).toBe(
			'mediaItemDetails.progressComplete:{"percent":47}',
		);
	});

	it("returns null once the instance is completed, even with a percent", () => {
		expect(getProgressLabel(46.875, "2024-01-15", tWithOptions)).toBeNull();
	});
});

describe("InstanceRow", () => {
	it("does not show season reviews when seasonReviews is null", () => {
		renderInstanceRow({ seasonReviews: null });
		expect(
			screen.queryByText("mediaItemDetails.seasonN"),
		).not.toBeInTheDocument();
	});

	it("does not show season reviews when seasonReviews is empty", () => {
		renderInstanceRow({ seasonReviews: [] });
		expect(
			screen.queryByText("mediaItemDetails.seasonN"),
		).not.toBeInTheDocument();
	});

	it("shows season reviews when seasonReviews has entries", () => {
		renderInstanceRow({
			seasonReviews: [
				{
					season: 1,
					startedAt: "",
					completedAt: "",
					rating: 0,
					reviewText: "",
				},
			],
		});
		expect(screen.getByText("mediaItemDetails.seasonN")).toBeInTheDocument();
	});

	it("shows the instance's fiction rating categories", () => {
		renderInstanceRow({ fictionRating: buildFictionRating() });

		expect(screen.getAllByText(/^fictionRating\./)).toHaveLength(5);
	});

	it("shows the exact instance rating next to its stars", () => {
		renderInstanceRow({ rating: 3.6 });

		expect(screen.getByText("3.6")).toBeInTheDocument();
	});

	it("shows the exact rating on a season review", () => {
		renderInstanceRow({
			seasonReviews: [
				{
					season: 1,
					startedAt: "",
					completedAt: "",
					rating: 4.4,
					reviewText: "",
				},
			],
		});

		expect(screen.getByText("4.4")).toBeInTheDocument();
	});

	it("hides the stars for an unrated instance", () => {
		renderInstanceRow({ rating: 0 });

		expect(screen.queryByTestId("rating-stars")).not.toBeInTheDocument();
	});

	it("shows the progress percentage when the instance has one", () => {
		renderInstanceRow({ progressPercent: 42 });

		expect(
			screen.getByText("mediaItemDetails.progressComplete"),
		).toBeInTheDocument();
	});

	it("shows a · separator between each of the three meta labels", () => {
		renderInstanceRow({
			startedAt: "2026-01-01",
			progressPercent: 42,
			consumptionInfo: { method: "ebook" },
		});

		expect(screen.getAllByText("·")).toHaveLength(2);
	});

	it("shows no progress percentage when the instance has none", () => {
		renderInstanceRow({ progressPercent: null });

		expect(
			screen.queryByText("mediaItemDetails.progressComplete"),
		).not.toBeInTheDocument();
	});

	it("shows no progress percentage once the instance is completed", () => {
		renderInstanceRow({
			progressPercent: 100,
			startedAt: "2026-01-01",
			completedAt: "2026-01-15",
		});

		expect(
			screen.queryByText("mediaItemDetails.progressComplete"),
		).not.toBeInTheDocument();
	});

	it("shows 'On Hold since' instead of the started date while on hold", () => {
		renderInstanceRow(
			{ startedAt: "2026-01-01" },
			{ status: MediaItemStatus.ON_HOLD, statusChangedAt: "2026-02-10" },
		);

		expect(
			screen.getByText("mediaItemDetails.onHoldSince"),
		).toBeInTheDocument();
		expect(screen.queryByText("Started Jan 01, 2026")).not.toBeInTheDocument();
	});

	it("omits the date segment while on hold when statusChangedAt is unknown", () => {
		renderInstanceRow(
			{ startedAt: "2026-01-01" },
			{ status: MediaItemStatus.ON_HOLD, statusChangedAt: null },
		);

		expect(
			screen.queryByText("mediaItemDetails.onHoldSince"),
		).not.toBeInTheDocument();
		expect(screen.queryByText("Started Jan 01, 2026")).not.toBeInTheDocument();
	});

	it("shows 'Dropped on' and the frozen progress percentage when dropped", () => {
		renderInstanceRow(
			{ startedAt: "2026-01-01", progressPercent: 50 },
			{ status: MediaItemStatus.DROPPED, statusChangedAt: "2026-03-05" },
		);

		expect(screen.getByText("mediaItemDetails.droppedOn")).toBeInTheDocument();
		expect(
			screen.getByText("mediaItemDetails.progressComplete"),
		).toBeInTheDocument();
		expect(screen.queryByText("Started Jan 01, 2026")).not.toBeInTheDocument();
	});

	it("shows a season review's fiction rating categories", () => {
		renderInstanceRow({
			seasonReviews: [
				{
					season: 1,
					startedAt: "",
					completedAt: "",
					rating: 0,
					reviewText: "",
					fictionRating: buildFictionRating(),
				},
			],
		});

		expect(screen.getAllByText(/^fictionRating\./)).toHaveLength(5);
	});
});

function buildFictionRating(): FictionRating {
	return {
		setting: { rating: 3 },
		character: { rating: 3 },
		plot: { rating: 3 },
		enjoyment: { rating: 3 },
		depth: { rating: 3 },
	};
}
