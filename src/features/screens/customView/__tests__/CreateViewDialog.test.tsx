import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CreateViewDialog } from "#/features/screens/customView/CreateViewDialog";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
}));

vi.mock("#/features/screens/customView/ViewFilterAndSortForm", () => ({
	ViewFilterAndSortForm: () => null,
}));

afterEach(cleanup);

describe("CreateViewDialog", () => {
	it("gives the dialog an accessible description", () => {
		render(<CreateViewDialog isOpen onClose={vi.fn()} />);

		expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
			"views.createDescription",
		);
	});
});
