import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FilterAndSortDialog } from "#/features/filterAndSort/FilterAndSortDialog";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("#/features/filterAndSort/FilterAndSortForm", () => ({
	FilterAndSortForm: () => null,
}));

afterEach(cleanup);

describe("FilterAndSortDialog", () => {
	it("gives the dialog an accessible description", () => {
		render(
			<FilterAndSortDialog
				isOpen
				onClose={vi.fn()}
				initialFilters={{}}
				onApply={vi.fn()}
			/>,
		);

		expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
			"library.filterAndSortDescription",
		);
	});
});
