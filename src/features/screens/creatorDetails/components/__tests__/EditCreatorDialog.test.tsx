import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditCreatorDialog } from "#/features/screens/creatorDetails/components/EditCreatorDialog";
import type { CreatorDetails } from "#/features/screens/creatorDetails/creatorDetails";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: vi.fn() }),
}));

vi.mock("#/features/screens/creatorDetails/creatorDetails", () => ({
	updateCreatorMetadata: vi.fn(),
}));

const toast = vi.fn();
vi.mock("#/components/hooks/useToast", () => ({
	useToast: () => ({ toast }),
}));

const CREATOR_DETAILS = {
	id: 1,
	name: "Isaac Asimov",
	biography: "A prolific author.",
} as unknown as CreatorDetails;

const creatorDetails = {
	id: 5,
	name: "Frank Herbert",
	biography: "",
} as unknown as CreatorDetails;

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("EditCreatorDialog", () => {
	it("gives the dialog an accessible description", () => {
		render(<EditCreatorDialog creatorDetails={CREATOR_DETAILS} />);

		fireEvent.click(screen.getByLabelText("creatorDetails.edit"));

		expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
			"creatorDetails.editDescription",
		);
	});

	it("shows a destructive toast with the failure message and stays open when updateCreatorMetadata rejects", async () => {
		const { updateCreatorMetadata } = await import(
			"#/features/screens/creatorDetails/creatorDetails"
		);
		vi.mocked(updateCreatorMetadata).mockRejectedValue(
			new Error("Name already in use."),
		);

		render(<EditCreatorDialog creatorDetails={creatorDetails} />);
		fireEvent.click(screen.getByLabelText("creatorDetails.edit"));
		fireEvent.click(screen.getByText("common.save"));

		await waitFor(() =>
			expect(toast).toHaveBeenCalledWith("Name already in use.", {
				variant: "destructive",
			}),
		);
		expect(screen.getByText("creatorDetails.edit")).toBeInTheDocument();
	});
});
