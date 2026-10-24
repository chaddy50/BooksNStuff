import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	createViewGroup,
	deleteViewGroup,
	renameViewGroup,
	type ViewGroup,
} from "#/features/screens/customView/viewGroup";
import { ViewGroupDialog } from "../ViewGroupDialog";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("#/features/screens/customView/viewGroup", () => ({
	createViewGroup: vi.fn(),
	renameViewGroup: vi.fn(),
	deleteViewGroup: vi.fn(),
}));

const createViewGroupMock = vi.mocked(createViewGroup);
const renameViewGroupMock = vi.mocked(renameViewGroup);
const deleteViewGroupMock = vi.mocked(deleteViewGroup);

const TIMESTAMP = new Date("2026-01-01T00:00:00Z");

const GROUP: ViewGroup = {
	id: 3,
	userId: "user-a",
	name: "Currently reading",
	displayOrder: 0,
	isCollapsed: false,
	createdAt: TIMESTAMP,
	updatedAt: TIMESTAMP,
};

let queryClient: QueryClient;
let onClose: ReturnType<typeof vi.fn>;

function renderDialog(group?: ViewGroup) {
	return render(
		<QueryClientProvider client={queryClient}>
			<ViewGroupDialog group={group} isOpen onClose={onClose} />
		</QueryClientProvider>,
	);
}

function nameInput() {
	return screen.getByLabelText("viewGroups.name");
}

function saveButton() {
	return screen.getByRole("button", { name: "common.save" });
}

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	onClose = vi.fn();
	// biome-ignore lint/suspicious/noExplicitAny: the created row is unused here
	createViewGroupMock.mockResolvedValue({} as any);
	renameViewGroupMock.mockResolvedValue(undefined);
	deleteViewGroupMock.mockResolvedValue(undefined);
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("ViewGroupDialog", () => {
	it("creates a group from the typed name and closes", async () => {
		renderDialog();

		fireEvent.change(nameInput(), { target: { value: "Comics" } });
		fireEvent.click(saveButton());

		await waitFor(() =>
			expect(createViewGroupMock).toHaveBeenCalledWith({
				data: { name: "Comics" },
			}),
		);
		await waitFor(() => expect(onClose).toHaveBeenCalled());
	});

	it("prefills the name when editing an existing group", () => {
		renderDialog(GROUP);

		expect(nameInput()).toHaveValue("Currently reading");
	});

	it("renames an existing group", async () => {
		renderDialog(GROUP);

		fireEvent.change(nameInput(), { target: { value: "Reading now" } });
		fireEvent.click(saveButton());

		await waitFor(() =>
			expect(renameViewGroupMock).toHaveBeenCalledWith({
				data: { id: 3, name: "Reading now" },
			}),
		);
		expect(createViewGroupMock).not.toHaveBeenCalled();
	});

	it("opens a confirmation dialog without deleting immediately", () => {
		renderDialog(GROUP);

		fireEvent.click(screen.getByRole("button", { name: /deleteGroup/ }));

		expect(screen.getByText("viewGroups.deleteTitle")).toBeInTheDocument();
		expect(deleteViewGroupMock).not.toHaveBeenCalled();
	});

	it("closes the confirmation dialog without deleting when cancelled", () => {
		renderDialog(GROUP);

		fireEvent.click(screen.getByRole("button", { name: /deleteGroup/ }));
		const cancelButtons = screen.getAllByRole("button", {
			name: "common.cancel",
		});
		fireEvent.click(cancelButtons[cancelButtons.length - 1]);

		expect(
			screen.queryByText("viewGroups.deleteTitle"),
		).not.toBeInTheDocument();
		expect(deleteViewGroupMock).not.toHaveBeenCalled();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("deletes a group and refreshes the views it hands back when confirmed", async () => {
		const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
		renderDialog(GROUP);

		fireEvent.click(screen.getByRole("button", { name: /deleteGroup/ }));
		fireEvent.click(
			screen.getByRole("button", { name: "common.confirmDelete" }),
		);

		await waitFor(() =>
			expect(deleteViewGroupMock).toHaveBeenCalledWith({ data: { id: 3 } }),
		);
		await waitFor(() =>
			expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["views"] }),
		);
		expect(invalidateQueries).toHaveBeenCalledWith({
			queryKey: ["viewGroups"],
		});
	});

	it("reports a delete that failed without closing", async () => {
		deleteViewGroupMock.mockRejectedValue(new Error("nope"));
		renderDialog(GROUP);

		fireEvent.click(screen.getByRole("button", { name: /deleteGroup/ }));
		fireEvent.click(
			screen.getByRole("button", { name: "common.confirmDelete" }),
		);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"viewGroups.deleteFailed",
		);
		expect(onClose).not.toHaveBeenCalled();
	});

	it("will not save a blank name", () => {
		renderDialog();

		expect(saveButton()).toBeDisabled();

		fireEvent.change(nameInput(), { target: { value: "   " } });

		expect(saveButton()).toBeDisabled();
	});

	it("offers no delete when creating", () => {
		renderDialog();

		expect(
			screen.queryByRole("button", { name: /deleteGroup/ }),
		).not.toBeInTheDocument();
	});

	it("closes without writing anything when cancelled", () => {
		renderDialog(GROUP);

		fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(renameViewGroupMock).not.toHaveBeenCalled();
		expect(deleteViewGroupMock).not.toHaveBeenCalled();
	});

	it("stays open and reports a save that failed", async () => {
		createViewGroupMock.mockRejectedValue(new Error("nope"));
		renderDialog();

		fireEvent.change(nameInput(), { target: { value: "Comics" } });
		fireEvent.click(saveButton());

		// Closing as though it had saved would leave the user believing the group
		// exists.
		// A live region, since the message arrives after an await with focus
		// still on the dialog's buttons.
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"viewGroups.actionFailed",
		);
		expect(onClose).not.toHaveBeenCalled();
	});
});
