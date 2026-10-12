import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "#/components/ui/tooltip";
import type { FictionRating } from "#/database/schema";
import {
	getConsumptionLabel,
	InstanceRow,
} from "#/features/screens/mediaItemDetails/components/history/components/instance/InstanceRow";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";

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

function renderInstanceRow(instanceOverrides: Partial<Instance> = {}) {
	return render(
		<TooltipProvider>
			<InstanceRow
				index={1}
				instance={{ ...baseInstance, ...instanceOverrides }}
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
