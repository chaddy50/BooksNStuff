import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediaItemDetailsScreen } from "#/features/screens/mediaItemDetails/MediaItemDetailsScreen";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const navigate = vi.fn();
let searchParams: { tab?: string } = {};
let loaderData: { id: number; title: string; instances: unknown[] } = {
	id: 7,
	title: "Test Item",
	instances: [],
};

vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({
		useLoaderData: () => loaderData,
		useSearch: () => searchParams,
	}),
	useNavigate: () => navigate,
	useBlocker: () => ({ status: "idle" }),
}));

vi.mock("#/features/navigation/topBar/TopBar", () => ({
	TopBar: (props: { right?: React.ReactNode }) => <div>{props.right}</div>,
}));

vi.mock(
	"#/features/screens/mediaItemDetails/components/header/MediaItemDetailsHeader",
	() => ({
		MediaItemDetailsHeader: (props: {
			onUpdateProgress: (instanceId: number) => void;
		}) => (
			<button type="button" onClick={() => props.onUpdateProgress(42)}>
				updateProgress
			</button>
		),
	}),
);

vi.mock(
	"#/features/screens/mediaItemDetails/components/overview/OverviewTab",
	() => ({
		OverviewTab: () => <div data-testid="overview-tab" />,
	}),
);

vi.mock(
	"#/features/screens/mediaItemDetails/components/relatedItems/RelatedItems",
	() => ({
		RelatedItems: () => <div data-testid="related-items" />,
	}),
);

vi.mock(
	"#/features/screens/mediaItemDetails/components/history/History",
	() => ({
		History: (props: {
			editingState: { idBeingEdited: number | "new" | null };
		}) => (
			<div data-testid="history">
				{String(props.editingState.idBeingEdited)}
			</div>
		),
	}),
);

vi.mock("#/features/screens/mediaItemDetails/mediaItemDetails", () => ({
	removeFromLibrary: vi.fn(),
}));

function clickRemoveFromLibrary() {
	fireEvent.click(screen.getByText("mediaItemDetails.removeFromLibrary"));
}

function confirmDelete() {
	fireEvent.click(screen.getByText("common.confirmDelete"));
}

function cancelDelete() {
	fireEvent.click(screen.getByText("common.cancel"));
}

afterEach(cleanup);
beforeEach(() => {
	vi.clearAllMocks();
	searchParams = {};
	loaderData = { id: 7, title: "Test Item", instances: [] };
});

describe("MediaItemDetailsScreen", () => {
	it("defaults to the overview tab when no tab is in the URL", () => {
		render(<MediaItemDetailsScreen />);

		expect(screen.getByTestId("overview-tab")).toBeInTheDocument();
		expect(screen.queryByTestId("history")).not.toBeInTheDocument();
		expect(screen.queryByTestId("related-items")).not.toBeInTheDocument();
	});

	it("shows the history panel when tab=history is in the URL", () => {
		searchParams = { tab: "history" };
		render(<MediaItemDetailsScreen />);

		expect(screen.getByTestId("history")).toBeInTheDocument();
		expect(screen.queryByTestId("overview-tab")).not.toBeInTheDocument();
	});

	it("shows the related panel when tab=related is in the URL", () => {
		searchParams = { tab: "related" };
		render(<MediaItemDetailsScreen />);

		expect(screen.getByTestId("related-items")).toBeInTheDocument();
	});

	it("keeps the scroll position when switching tabs", () => {
		render(<MediaItemDetailsScreen />);

		fireEvent.click(screen.getByText("mediaItemDetails.history"));

		expect(navigate).toHaveBeenCalledWith({
			to: "/mediaItemDetails/$mediaItemId",
			params: { mediaItemId: "7" },
			search: { tab: "history" },
			resetScroll: false,
			replace: true,
		});
	});

	it("navigates to the history tab and opens the given instance when progress is updated", () => {
		render(<MediaItemDetailsScreen />);

		fireEvent.click(screen.getByText("updateProgress"));

		expect(navigate).toHaveBeenCalledWith({
			to: "/mediaItemDetails/$mediaItemId",
			params: { mediaItemId: "7" },
			search: { tab: "history" },
			resetScroll: false,
			replace: true,
		});
	});

	it("opens the given instance without an extra navigation when already on the history tab", () => {
		searchParams = { tab: "history" };
		render(<MediaItemDetailsScreen />);

		fireEvent.click(screen.getByText("updateProgress"));

		expect(navigate).not.toHaveBeenCalled();
		expect(screen.getByTestId("history")).toHaveTextContent("42");
	});

	it("opens the confirmation dialog without deleting immediately", async () => {
		const { removeFromLibrary } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		render(<MediaItemDetailsScreen />);

		clickRemoveFromLibrary();

		expect(
			screen.getByText("mediaItemDetails.deleteTitle"),
		).toBeInTheDocument();
		expect(removeFromLibrary).not.toHaveBeenCalled();
	});

	it("closes the dialog without deleting when cancel is clicked", async () => {
		const { removeFromLibrary } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		render(<MediaItemDetailsScreen />);

		clickRemoveFromLibrary();
		cancelDelete();

		expect(
			screen.queryByText("mediaItemDetails.deleteTitle"),
		).not.toBeInTheDocument();
		expect(removeFromLibrary).not.toHaveBeenCalled();
	});

	// The server fn is keyed on the item now, not on a separate metadata row.
	it("removes by mediaItemId, never by metadataId", async () => {
		const { removeFromLibrary } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(removeFromLibrary).mockResolvedValue(undefined);
		render(<MediaItemDetailsScreen />);

		clickRemoveFromLibrary();
		confirmDelete();

		expect(removeFromLibrary).toHaveBeenCalledWith({
			data: { mediaItemId: 7 },
		});
		const [payload] = vi.mocked(removeFromLibrary).mock.calls[0];
		expect(payload.data).not.toHaveProperty("metadataId");
	});

	it("navigates home after a successful delete", async () => {
		const { removeFromLibrary } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(removeFromLibrary).mockResolvedValue(undefined);
		render(<MediaItemDetailsScreen />);

		clickRemoveFromLibrary();
		confirmDelete();

		await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/" }));
	});

	it("shows an error and does not navigate when the delete fails", async () => {
		const { removeFromLibrary } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(removeFromLibrary).mockRejectedValue(new Error("network down"));
		render(<MediaItemDetailsScreen />);

		clickRemoveFromLibrary();
		confirmDelete();

		await vi.waitFor(() =>
			expect(screen.getByRole("alert")).toBeInTheDocument(),
		);
		expect(navigate).not.toHaveBeenCalledWith({ to: "/" });
	});
});
