import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ViewFilterAndSortForm } from "../ViewFilterAndSortForm";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-query", () => ({
	useQuery: () => ({ data: [] }),
}));

vi.mock("#/lib/tags", () => ({ getTags: vi.fn() }));
vi.mock("#/lib/genres/genres", () => ({ getGenres: vi.fn() }));

const toast = vi.fn();
vi.mock("#/components/hooks/useToast", () => ({
	useToast: () => ({ toast }),
}));

let capturedSortingOptionsProps: Record<string, unknown> | null = null;
vi.mock("#/features/filterAndSort/components/SortingOptions", () => ({
	SortingOptions: (props: Record<string, unknown>) => {
		capturedSortingOptionsProps = props;
		return <div data-testid="sorting-options" />;
	},
}));

vi.mock("#/features/filterAndSort/components/Filters", () => ({
	Filters: () => <div />,
}));
let capturedFilterAndSortActionsProps: Record<string, unknown> | null = null;
vi.mock("#/features/filterAndSort/components/FilterAndSortActions", () => ({
	FilterAndSortActions: (props: Record<string, unknown>) => {
		capturedFilterAndSortActionsProps = props;
		return <div />;
	},
}));
vi.mock("#/features/filterAndSort/components/ViewName", () => ({
	ViewName: () => <div />,
}));
vi.mock("#/features/filterAndSort/components/ViewSubject", () => ({
	ViewSubjectChooser: () => <div />,
}));

afterEach(() => {
	capturedSortingOptionsProps = null;
	capturedFilterAndSortActionsProps = null;
	cleanup();
	vi.clearAllMocks();
});

describe("ViewFilterAndSortForm", () => {
	it("lets its sorting options offer custom order", () => {
		render(<ViewFilterAndSortForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

		expect(capturedSortingOptionsProps?.shouldAllowCustomOrder).toBe(true);
	});

	it("shows a destructive toast with the failure message when saving fails", async () => {
		const onSubmit = vi.fn().mockRejectedValue(new Error("Network error"));
		render(<ViewFilterAndSortForm onSubmit={onSubmit} onCancel={vi.fn()} />);

		await act(async () => {
			await (
				capturedFilterAndSortActionsProps?.onSubmit as () => Promise<void>
			)();
		});

		expect(toast).toHaveBeenCalledWith("Network error", {
			variant: "destructive",
		});
	});

	it("shows a destructive toast with the failure message when deleting fails", async () => {
		const onDelete = vi.fn().mockRejectedValue(new Error("Could not delete"));
		render(
			<ViewFilterAndSortForm
				onSubmit={vi.fn()}
				onCancel={vi.fn()}
				onDelete={onDelete}
			/>,
		);

		await act(async () => {
			await (
				capturedFilterAndSortActionsProps?.onDelete as () => Promise<void>
			)();
		});

		expect(toast).toHaveBeenCalledWith("Could not delete", {
			variant: "destructive",
		});
	});
});
