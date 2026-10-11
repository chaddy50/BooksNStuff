import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/lib/enums";
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
) {
	return render(
		<MediaItemDetailsHeaderCurrentInstance
			instance={{ ...baseInstance, ...instanceOverrides }}
			mediaItemType={MediaItemType.BOOK}
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

		expect(screen.getByText("Jan 01, 2026 – Present")).toBeInTheDocument();
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

		expect(screen.getByText("Jan 01, 2026 – Present")).toBeInTheDocument();
		expect(
			screen.queryByText("mediaItemDetails.progressComplete"),
		).not.toBeInTheDocument();
	});

	it("renders a thinner progress bar than the default", () => {
		renderCurrentInstance({ progressPercent: 42 });

		expect(screen.getByRole("progressbar")).toHaveClass("h-1", {
			exact: false,
		});
		expect(screen.getByRole("progressbar")).not.toHaveClass("h-2.5");
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
});
