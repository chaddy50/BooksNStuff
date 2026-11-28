import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { InstanceEditorState } from "#/features/screens/mediaItemDetails/components/useInstanceEditorState";
import type { MediaItemDetails } from "#/features/screens/mediaItemDetails/mediaItemDetails";
import { History } from "../History";

const editorState = {
	modalState: null,
	editorRef: { current: null },
	guard: {
		isPrompting: false,
		isSaving: false,
		keepEditing: vi.fn(),
		discard: vi.fn(),
		saveAndContinue: vi.fn(),
		startEditing: (proceed: () => void) => proceed(),
	},
	openReviewAndComplete: vi.fn(),
	openEditInstance: vi.fn(),
	closeModal: vi.fn(),
} as unknown as InstanceEditorState;

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: vi.fn() }),
}));

vi.mock(
	"#/features/screens/mediaItemDetails/components/history/components/instance/InstanceList",
	() => ({
		InstanceList: () => <div data-testid="instance-list" />,
	}),
);

vi.mock(
	"#/features/screens/mediaItemDetails/components/EditEntryModal",
	() => ({
		EditEntryModal: () => null,
	}),
);

vi.mock("#/components/UnsavedChangesDialog", () => ({
	UnsavedChangesDialog: () => null,
}));

afterEach(cleanup);

describe("History", () => {
	it("renders a de-emphasized 'History' heading before the instance list", () => {
		render(
			<History
				mediaItemDetails={
					{ id: 1, instances: [] } as unknown as MediaItemDetails
				}
				editorState={editorState}
				onSeriesCompletionNeeded={vi.fn()}
			/>,
		);

		const heading = screen.getByRole("heading", {
			name: "mediaItemDetails.history",
		});
		const list = screen.getByTestId("instance-list");

		expect(heading).not.toHaveClass("text-lg", "font-semibold");
		expect(
			heading.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});
});
