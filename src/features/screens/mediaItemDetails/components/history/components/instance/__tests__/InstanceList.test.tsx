import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstanceList } from "#/features/screens/mediaItemDetails/components/history/components/instance/InstanceList";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemStatus, MediaItemType } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: vi.fn() }),
}));

// Stands in for the real editor so the props InstanceList computes and passes
// down are directly observable; InstanceEditForm's own behavior is covered by
// its own suite.
vi.mock(
	"#/features/screens/mediaItemDetails/components/history/components/instance/InstanceEditForm",
	() => ({
		InstanceEditForm: (props: {
			pageCount?: number;
			status?: MediaItemStatus;
			statusChangedAt?: string | null;
		}) => (
			<div data-testid="editor">
				pageCount:{String(props.pageCount)} status:{String(props.status)}{" "}
				statusChangedAt:{String(props.statusChangedAt)}
			</div>
		),
	}),
);

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

afterEach(cleanup);

describe("InstanceList", () => {
	it("passes the book's pageCount to the editor for a new entry", () => {
		render(
			<InstanceList
				mediaItemDetails={buildMediaItemDetails({
					metadata: { pageCount: 320 },
				})}
				idBeingEdited="new"
				setIdBeingEdited={vi.fn()}
				startEditing={vi.fn()}
				editorRef={{ current: null }}
				onSeriesCompletionNeeded={vi.fn()}
			/>,
		);

		expect(screen.getByTestId("editor")).toHaveTextContent("pageCount:320");
	});

	it("omits pageCount for a non-book media type even when metadata has one", () => {
		render(
			<InstanceList
				mediaItemDetails={buildMediaItemDetails({
					type: MediaItemType.MOVIE,
					metadata: { pageCount: 320 },
				})}
				idBeingEdited="new"
				setIdBeingEdited={vi.fn()}
				startEditing={vi.fn()}
				editorRef={{ current: null }}
				onSeriesCompletionNeeded={vi.fn()}
			/>,
		);

		expect(screen.getByTestId("editor")).toHaveTextContent(
			"pageCount:undefined",
		);
	});

	it("passes pageCount through to the editor for an existing entry", () => {
		render(
			<InstanceList
				mediaItemDetails={buildMediaItemDetails({
					metadata: { pageCount: 320 },
					instances: [
						{
							id: 1,
							rating: 0,
							fictionRating: null,
							seasonReviews: null,
							consumptionInfo: null,
							reviewText: null,
							progressPercent: null,
							startedAt: null,
							completedAt: null,
						},
					],
				})}
				idBeingEdited={1}
				setIdBeingEdited={vi.fn()}
				startEditing={vi.fn()}
				editorRef={{ current: null }}
				onSeriesCompletionNeeded={vi.fn()}
			/>,
		);

		expect(screen.getByTestId("editor")).toHaveTextContent("pageCount:320");
	});

	it("passes the item's status and statusChangedAt through to the editor", () => {
		render(
			<InstanceList
				mediaItemDetails={buildMediaItemDetails({
					status: MediaItemStatus.ON_HOLD,
					statusChangedAt: "2024-02-10",
				})}
				idBeingEdited="new"
				setIdBeingEdited={vi.fn()}
				startEditing={vi.fn()}
				editorRef={{ current: null }}
			/>,
		);

		expect(screen.getByTestId("editor")).toHaveTextContent("status:on_hold");
		expect(screen.getByTestId("editor")).toHaveTextContent(
			"statusChangedAt:2024-02-10",
		);
	});
});
