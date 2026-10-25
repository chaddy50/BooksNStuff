import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useImperativeHandle } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { History } from "#/features/screens/mediaItemDetails/components/history/History";
import { useInstanceEditingState } from "#/features/screens/mediaItemDetails/components/history/useInstanceEditingState";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { MediaItemType } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: vi.fn() }),
	useBlocker: () => ({ status: "idle" }),
}));

const editorHasUnsavedChanges = vi.fn<() => boolean>();
const editorSave = vi.fn<() => Promise<boolean>>();

// Stands in for the real editor so dirtiness and save outcome are controllable;
// InstanceEditForm's own behavior is covered by its suite.
vi.mock(
	"#/features/screens/mediaItemDetails/components/history/components/instance/InstanceEditForm",
	() => ({
		InstanceEditForm: (props: {
			instance?: { id: number };
			onCancel: () => void;
			ref?: React.Ref<{
				hasUnsavedChanges: () => boolean;
				save: () => Promise<boolean>;
			}>;
		}) => {
			useImperativeHandle(props.ref, () => ({
				hasUnsavedChanges: () => editorHasUnsavedChanges(),
				save: () => editorSave(),
			}));
			return (
				<div data-testid={`editor-${props.instance?.id ?? "new"}`}>
					<button type="button" onClick={props.onCancel}>
						mediaItemDetails.cancel
					</button>
				</div>
			);
		},
	}),
);

const mediaItemDetails = {
	id: 7,
	type: MediaItemType.BOOK,
	metadata: {},
	instances: [
		{
			id: 1,
			rating: 0,
			fictionRating: null,
			seasonReviews: null,
			consumptionInfo: null,
			reviewText: null,
			startedAt: null,
			completedAt: null,
		},
		{
			id: 2,
			rating: 0,
			fictionRating: null,
			seasonReviews: null,
			consumptionInfo: null,
			reviewText: null,
			startedAt: null,
			completedAt: null,
		},
	],
} as unknown as MediaItemDetails;

function HistoryHarness(props: {
	mediaItemDetails: MediaItemDetails;
	isUnsavedChangesGuardEnabled?: () => boolean;
}) {
	const editingState = useInstanceEditingState({
		isUnsavedChangesGuardEnabled: props.isUnsavedChangesGuardEnabled,
	});
	return (
		<History
			mediaItemDetails={props.mediaItemDetails}
			editingState={editingState}
			onSeriesCompletionNeeded={vi.fn()}
		/>
	);
}

/** Opens the editor on the first entry, which every switching case starts from. */
function openFirstEditor() {
	fireEvent.click(screen.getAllByText("mediaItemDetails.edit")[0]);
	expect(screen.getByTestId("editor-1")).toBeInTheDocument();
}

afterEach(cleanup);
beforeEach(() => {
	vi.clearAllMocks();
	editorHasUnsavedChanges.mockReturnValue(false);
	editorSave.mockResolvedValue(true);
});

describe("History", () => {
	it("switches entries immediately when the open editor is clean", () => {
		render(<HistoryHarness mediaItemDetails={mediaItemDetails} />);
		openFirstEditor();

		fireEvent.click(screen.getByText("mediaItemDetails.edit"));

		expect(screen.getByTestId("editor-2")).toBeInTheDocument();
		expect(screen.queryByText("unsavedChanges.title")).not.toBeInTheDocument();
	});

	it("prompts instead of switching entries when the open editor is dirty", () => {
		render(<HistoryHarness mediaItemDetails={mediaItemDetails} />);
		openFirstEditor();
		editorHasUnsavedChanges.mockReturnValue(true);

		fireEvent.click(screen.getByText("mediaItemDetails.edit"));

		expect(screen.getByText("unsavedChanges.title")).toBeInTheDocument();
		expect(screen.getByTestId("editor-1")).toBeInTheDocument();
		expect(screen.queryByTestId("editor-2")).not.toBeInTheDocument();
	});

	it("completes the switch without saving when the user discards", () => {
		render(<HistoryHarness mediaItemDetails={mediaItemDetails} />);
		openFirstEditor();
		editorHasUnsavedChanges.mockReturnValue(true);
		fireEvent.click(screen.getByText("mediaItemDetails.edit"));

		fireEvent.click(screen.getByText("unsavedChanges.discard"));

		expect(screen.getByTestId("editor-2")).toBeInTheDocument();
		expect(editorSave).not.toHaveBeenCalled();
		expect(screen.queryByText("unsavedChanges.title")).not.toBeInTheDocument();
	});

	it("saves and then completes the switch when the user saves and continues", async () => {
		render(<HistoryHarness mediaItemDetails={mediaItemDetails} />);
		openFirstEditor();
		editorHasUnsavedChanges.mockReturnValue(true);
		fireEvent.click(screen.getByText("mediaItemDetails.edit"));

		fireEvent.click(screen.getByText("unsavedChanges.saveAndContinue"));

		await vi.waitFor(() =>
			expect(screen.getByTestId("editor-2")).toBeInTheDocument(),
		);
		expect(editorSave).toHaveBeenCalledTimes(1);
	});

	it("keeps the user on the current entry when the save is refused", async () => {
		editorSave.mockResolvedValue(false);
		render(<HistoryHarness mediaItemDetails={mediaItemDetails} />);
		openFirstEditor();
		editorHasUnsavedChanges.mockReturnValue(true);
		fireEvent.click(screen.getByText("mediaItemDetails.edit"));

		fireEvent.click(screen.getByText("unsavedChanges.saveAndContinue"));

		await vi.waitFor(() => expect(editorSave).toHaveBeenCalledTimes(1));
		expect(screen.getByTestId("editor-1")).toBeInTheDocument();
		expect(screen.queryByTestId("editor-2")).not.toBeInTheDocument();
	});

	it("cancels the pending switch when the user keeps editing", () => {
		render(<HistoryHarness mediaItemDetails={mediaItemDetails} />);
		openFirstEditor();
		editorHasUnsavedChanges.mockReturnValue(true);
		fireEvent.click(screen.getByText("mediaItemDetails.edit"));

		fireEvent.click(screen.getByText("unsavedChanges.keepEditing"));

		expect(screen.getByTestId("editor-1")).toBeInTheDocument();
		expect(screen.queryByTestId("editor-2")).not.toBeInTheDocument();
		expect(editorSave).not.toHaveBeenCalled();
	});

	it("guards adding a new entry while the open editor is dirty", () => {
		render(<HistoryHarness mediaItemDetails={mediaItemDetails} />);
		openFirstEditor();
		editorHasUnsavedChanges.mockReturnValue(true);

		fireEvent.click(screen.getByText("mediaItemDetails.addInstance"));
		expect(screen.getByText("unsavedChanges.title")).toBeInTheDocument();
		expect(screen.queryByTestId("editor-new")).not.toBeInTheDocument();

		fireEvent.click(screen.getByText("unsavedChanges.discard"));
		expect(screen.getByTestId("editor-new")).toBeInTheDocument();
	});

	it("adds a new entry immediately when nothing is dirty", () => {
		render(<HistoryHarness mediaItemDetails={mediaItemDetails} />);

		fireEvent.click(screen.getByText("mediaItemDetails.addInstance"));

		expect(screen.getByTestId("editor-new")).toBeInTheDocument();
		expect(screen.queryByText("unsavedChanges.title")).not.toBeInTheDocument();
	});

	it("never guards the editor's own cancel button", () => {
		render(<HistoryHarness mediaItemDetails={mediaItemDetails} />);
		openFirstEditor();
		editorHasUnsavedChanges.mockReturnValue(true);

		fireEvent.click(screen.getByText("mediaItemDetails.cancel"));

		expect(screen.queryByTestId("editor-1")).not.toBeInTheDocument();
		expect(screen.queryByText("unsavedChanges.title")).not.toBeInTheDocument();
		expect(editorSave).not.toHaveBeenCalled();
	});

	it("treats a closed editor as clean", () => {
		editorHasUnsavedChanges.mockReturnValue(true);
		render(<HistoryHarness mediaItemDetails={mediaItemDetails} />);

		fireEvent.click(screen.getAllByText("mediaItemDetails.edit")[0]);

		expect(screen.getByTestId("editor-1")).toBeInTheDocument();
		expect(screen.queryByText("unsavedChanges.title")).not.toBeInTheDocument();
	});

	it("shows the empty state when there are no entries", () => {
		render(
			<HistoryHarness
				mediaItemDetails={
					{ ...mediaItemDetails, instances: [] } as unknown as MediaItemDetails
				}
			/>,
		);

		expect(
			screen.getByText("mediaItemDetails.noInstances"),
		).toBeInTheDocument();
	});

	it("does not prompt while the screen has disabled the guard", () => {
		render(
			<HistoryHarness
				mediaItemDetails={mediaItemDetails}
				isUnsavedChangesGuardEnabled={() => false}
			/>,
		);
		openFirstEditor();
		editorHasUnsavedChanges.mockReturnValue(true);

		fireEvent.click(screen.getByText("mediaItemDetails.edit"));

		expect(screen.getByTestId("editor-2")).toBeInTheDocument();
		expect(screen.queryByText("unsavedChanges.title")).not.toBeInTheDocument();
	});
});
