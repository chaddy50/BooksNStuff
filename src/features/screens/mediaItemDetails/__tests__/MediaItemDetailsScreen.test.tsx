import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MediaItemDetailsScreen } from "#/features/screens/mediaItemDetails/MediaItemDetailsScreen";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const navigate = vi.fn();
let searchParams: { tab?: string } = {};
let loaderData: { id: number; instances: unknown[] } = {
	id: 7,
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
		MediaItemDetailsHeader: (props: { onLogProgress: () => void }) => (
			<button type="button" onClick={props.onLogProgress}>
				logProgress
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

afterEach(cleanup);
beforeEach(() => {
	vi.clearAllMocks();
	searchParams = {};
	loaderData = { id: 7, instances: [] };
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
		});
	});

	it("navigates to the history tab and starts a new entry when logging progress with no unfinished instance", () => {
		render(<MediaItemDetailsScreen />);

		fireEvent.click(screen.getByText("logProgress"));

		expect(navigate).toHaveBeenCalledWith({
			to: "/mediaItemDetails/$mediaItemId",
			params: { mediaItemId: "7" },
			search: { tab: "history" },
			resetScroll: false,
		});
	});

	it("opens the existing unfinished instance when logging progress and one exists", () => {
		loaderData = {
			id: 7,
			instances: [
				{ id: 42, startedAt: "2026-01-01", completedAt: null },
				{ id: 41, startedAt: "2025-01-01", completedAt: "2025-02-01" },
			],
		};
		searchParams = { tab: "history" };
		render(<MediaItemDetailsScreen />);

		fireEvent.click(screen.getByText("logProgress"));

		expect(screen.getByTestId("history")).toHaveTextContent("42");
	});

	// The server fn is keyed on the item now, not on a separate metadata row.
	it("removes by mediaItemId, never by metadataId", async () => {
		const { removeFromLibrary } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(removeFromLibrary).mockResolvedValue(undefined);
		render(<MediaItemDetailsScreen />);

		clickRemoveFromLibrary();

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

		await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/" }));
	});

	it("does not navigate when the delete fails", async () => {
		const { removeFromLibrary } = await import(
			"#/features/screens/mediaItemDetails/mediaItemDetails"
		);
		vi.mocked(removeFromLibrary).mockRejectedValue(new Error("network down"));
		const ignoreRejection = () => {};
		process.on("unhandledRejection", ignoreRejection);
		render(<MediaItemDetailsScreen />);

		clickRemoveFromLibrary();

		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(navigate).not.toHaveBeenCalledWith({ to: "/" });
		process.off("unhandledRejection", ignoreRejection);
	});
});
