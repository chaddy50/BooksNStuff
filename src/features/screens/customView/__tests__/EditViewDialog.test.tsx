import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditViewDialog } from "#/features/screens/customView/EditViewDialog";
import type { View } from "#/features/screens/customView/view";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-query", () => ({
	useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("#/features/screens/customView/ViewFilterAndSortForm", () => ({
	ViewFilterAndSortForm: () => null,
}));

const VIEW: View = {
	id: 1,
	userId: "user-a",
	name: "Currently reading",
	subject: "items",
	filters: {},
	displayOrder: 0,
	groupId: null,
	createdAt: new Date("2026-01-01T00:00:00Z"),
	updatedAt: new Date("2026-01-01T00:00:00Z"),
};

afterEach(cleanup);

describe("EditViewDialog", () => {
	it("gives the dialog an accessible description", () => {
		render(
			<EditViewDialog
				view={VIEW}
				isOpen
				onClose={vi.fn()}
				onUpdated={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);

		expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
			"views.editDescription",
		);
	});
});
