import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditCreatorDialog } from "#/features/screens/creatorDetails/components/EditCreatorDialog";
import type { CreatorDetails } from "#/features/screens/creatorDetails/creatorDetails";

const t = (key: string) => key;
vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t }),
}));

vi.mock("@tanstack/react-router", () => ({
	useRouter: () => ({ invalidate: vi.fn() }),
}));

vi.mock("#/features/screens/creatorDetails/creatorDetails", () => ({
	updateCreatorMetadata: vi.fn(),
}));

const CREATOR_DETAILS = {
	id: 1,
	name: "Isaac Asimov",
	biography: "A prolific author.",
} as unknown as CreatorDetails;

afterEach(cleanup);

describe("EditCreatorDialog", () => {
	it("gives the dialog an accessible description", () => {
		render(<EditCreatorDialog creatorDetails={CREATOR_DETAILS} />);

		fireEvent.click(screen.getByLabelText("creatorDetails.edit"));

		expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
			"creatorDetails.editDescription",
		);
	});
});
