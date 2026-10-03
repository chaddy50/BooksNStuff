import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getViews, type View } from "#/features/screens/customView/view";
import {
	getViewGroups,
	setViewGroupCollapsed,
	type ViewGroup,
} from "#/features/screens/customView/viewGroup";
import { NavDrawer } from "../NavDrawer";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("#/features/screens/customView/view", () => ({
	getViews: vi.fn(),
}));
vi.mock("#/features/screens/customView/viewGroup", () => ({
	getViewGroups: vi.fn(),
	setViewGroupCollapsed: vi.fn(),
}));

vi.mock("#/features/screens/customView/CreateViewDialog", () => ({
	CreateViewDialog: () => null,
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		params,
		className,
	}: {
		children: ReactNode;
		to: string;
		params?: Record<string, string>;
		className?: string;
	}) => (
		<a
			href={params?.viewId ? `/views/${params.viewId}` : to}
			className={className}
		>
			{children}
		</a>
	),
}));

const getViewsMock = vi.mocked(getViews);
const getViewGroupsMock = vi.mocked(getViewGroups);
const setViewGroupCollapsedMock = vi.mocked(setViewGroupCollapsed);

const TIMESTAMP = new Date("2026-01-01T00:00:00Z");

function makeView(
	id: number,
	name: string,
	overrides: { displayOrder?: number; groupId?: number | null } = {},
): View {
	return {
		id,
		userId: "user-a",
		name,
		subject: "items",
		filters: {},
		displayOrder: overrides.displayOrder ?? 0,
		groupId: overrides.groupId ?? null,
		createdAt: TIMESTAMP,
		updatedAt: TIMESTAMP,
	};
}

function makeGroup(
	id: number,
	name: string,
	overrides: { displayOrder?: number; isCollapsed?: boolean } = {},
): ViewGroup {
	return {
		id,
		userId: "user-a",
		name,
		displayOrder: overrides.displayOrder ?? 0,
		isCollapsed: overrides.isCollapsed ?? false,
		createdAt: TIMESTAMP,
		updatedAt: TIMESTAMP,
	};
}

let queryClient: QueryClient;

function renderDrawer() {
	return render(
		<QueryClientProvider client={queryClient}>
			<NavDrawer isOpen onClose={vi.fn()} />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	getViewsMock.mockResolvedValue([
		makeView(1, "Fantasy books", { displayOrder: 0 }),
		makeView(2, "Sci-fi books", { displayOrder: 0, groupId: 10 }),
	]);
	getViewGroupsMock.mockResolvedValue([
		makeGroup(10, "Currently reading", { displayOrder: 1 }),
	]);
	setViewGroupCollapsedMock.mockResolvedValue(undefined);
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

describe("NavDrawer", () => {
	it("mirrors the sidebar's order, with grouped views nested", async () => {
		renderDrawer();

		await screen.findByText("Fantasy books");
		const labels = screen
			.getAllByText(/Fantasy books|Currently reading|Sci-fi books/)
			.map((element) => element.textContent);

		expect(labels).toEqual([
			"Fantasy books",
			"Currently reading",
			"Sci-fi books",
		]);
	});

	it("hides a collapsed group's views", async () => {
		getViewGroupsMock.mockResolvedValue([
			makeGroup(10, "Currently reading", {
				displayOrder: 1,
				isCollapsed: true,
			}),
		]);
		renderDrawer();

		await screen.findByText("Currently reading");

		expect(screen.queryByText("Sci-fi books")).not.toBeInTheDocument();
	});

	it("shares the collapsed state with the sidebar when toggled", async () => {
		const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
		renderDrawer();

		fireEvent.click(await screen.findByLabelText("viewGroups.collapse"));

		await waitFor(() =>
			expect(setViewGroupCollapsedMock).toHaveBeenCalledWith({
				data: { id: 10, isCollapsed: true },
			}),
		);
		await waitFor(() =>
			expect(invalidateQueries).toHaveBeenCalledWith({
				queryKey: ["viewGroups"],
			}),
		);
	});

	it("offers no drag handles — the drawer does not reorder", async () => {
		const { container } = renderDrawer();

		await screen.findByText("Fantasy books");

		expect(
			container.querySelector('[aria-label="viewGroups.dragToReorder"]'),
		).toBeNull();
	});

	it("links a view row to that view", async () => {
		renderDrawer();

		expect(await screen.findByText("Sci-fi books")).toHaveAttribute(
			"href",
			"/views/2",
		);
	});

	it("shows the bare empty state only when there are no views and no groups", async () => {
		getViewsMock.mockResolvedValue([]);
		getViewGroupsMock.mockResolvedValue([]);
		renderDrawer();

		await waitFor(() =>
			expect(screen.queryByText("nav.views")).not.toBeInTheDocument(),
		);
		expect(screen.getByRole("button", { name: /newView/ })).toBeInTheDocument();
	});

	it("keeps the grouped list when only a group exists", async () => {
		getViewsMock.mockResolvedValue([]);
		getViewGroupsMock.mockResolvedValue([makeGroup(10, "Currently reading")]);
		renderDrawer();

		expect(await screen.findByText("nav.views")).toBeInTheDocument();
		expect(screen.getByText("Currently reading")).toBeInTheDocument();
	});

	it("gives a view row a comfortable tap target", async () => {
		renderDrawer();

		expect(await screen.findByText("Fantasy books")).toHaveClass("py-3");
	});

	it("gives a group's toggle a comfortable tap target", async () => {
		renderDrawer();

		const groupName = await screen.findByText("Currently reading");
		expect(groupName.closest("button")).toHaveClass("py-3");
	});

	it("gives the settings link a comfortable tap target", async () => {
		renderDrawer();

		expect(await screen.findByText("nav.settings")).toHaveClass("py-3");
	});
});
