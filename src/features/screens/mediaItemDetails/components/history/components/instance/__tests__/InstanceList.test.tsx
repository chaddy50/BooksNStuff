import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstanceList } from "#/features/screens/mediaItemDetails/components/history/components/instance/InstanceList";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

function buildMediaItemDetails(
	overrides: Partial<MediaItemDetails>,
): MediaItemDetails {
	return {
		id: 7,
		type: MediaItemType.BOOK,
		status: MediaItemStatus.IN_PROGRESS,
		statusChangedAt: null,
		metadata: {},
		instances: [],
		...overrides,
	} as unknown as MediaItemDetails;
}

function buildInstance(
	overrides: Partial<MediaItemDetails["instances"][number]>,
) {
	return {
		id: 1,
		rating: 0,
		fictionRating: null,
		seasonReviews: null,
		consumptionInfo: null,
		reviewText: null,
		progressPercent: null,
		startedAt: null,
		completedAt: null,
		...overrides,
	} as MediaItemDetails["instances"][number];
}

afterEach(cleanup);

describe("InstanceList", () => {
	it("shows an empty-state message when there are no instances", () => {
		render(
			<InstanceList
				mediaItemDetails={buildMediaItemDetails({ instances: [] })}
				onEdit={vi.fn()}
			/>,
		);

		expect(
			screen.getByText("mediaItemDetails.noInstances"),
		).toBeInTheDocument();
	});

	it("renders every instance as a row, never as an inline editor", () => {
		render(
			<InstanceList
				mediaItemDetails={buildMediaItemDetails({
					instances: [buildInstance({ id: 1 }), buildInstance({ id: 2 })],
				})}
				onEdit={vi.fn()}
			/>,
		);

		expect(
			screen.getAllByRole("button", { name: "mediaItemDetails.edit" }),
		).toHaveLength(2);
	});

	it("calls onEdit with the clicked row's instance id", () => {
		const onEdit = vi.fn();
		render(
			<InstanceList
				mediaItemDetails={buildMediaItemDetails({
					instances: [buildInstance({ id: 5 })],
				})}
				onEdit={onEdit}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: "mediaItemDetails.edit" }),
		);

		expect(onEdit).toHaveBeenCalledWith(5);
	});
});
