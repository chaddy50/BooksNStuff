import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SeriesDetailsScreen } from "#/features/screens/seriesDetails/SeriesDetailsScreen";
import { MediaItemType } from "#/lib/enums";

const seriesDetailsFixture = {
	id: 12,
	name: "Test Series",
	type: MediaItemType.BOOK,
	items: [],
};

const navigate = vi.fn();

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({ useLoaderData: () => seriesDetailsFixture }),
	useNavigate: () => navigate,
}));

vi.mock("#/features/screens/seriesDetails/seriesDetails", () => ({
	deleteSeries: vi.fn(),
}));

vi.mock("#/features/navigation/topBar/TopBar", () => ({
	TopBar: (props: { right?: React.ReactNode }) => <div>{props.right}</div>,
}));

vi.mock("#/features/screens/seriesDetails/components/SeriesInfo", () => ({
	SeriesInfo: () => <div data-testid="series-info" />,
}));

vi.mock("#/features/screens/seriesDetails/components/SeriesItems", () => ({
	SeriesItems: () => <div data-testid="series-items" />,
}));

vi.mock(
	"#/features/screens/seriesDetails/components/MissingSeriesItems",
	() => ({
		MissingSeriesItems: ({
			seriesId,
			seriesType,
		}: {
			seriesId: number;
			seriesType: string;
		}) => (
			<div
				data-testid="missing-series-items"
				data-series-id={seriesId}
				data-series-type={seriesType}
			/>
		),
	}),
);

function clickDeleteSeries() {
	fireEvent.click(screen.getByText("seriesDetails.delete"));
}

function confirmDelete() {
	fireEvent.click(screen.getByText("common.confirmDelete"));
}

function cancelDelete() {
	fireEvent.click(screen.getByText("common.cancel"));
}

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("SeriesDetailsScreen", () => {
	it("renders the missing-items section below the library items", () => {
		render(<SeriesDetailsScreen />);

		const libraryItems = screen.getByTestId("series-items");
		const missingItems = screen.getByTestId("missing-series-items");

		expect(
			libraryItems.compareDocumentPosition(missingItems) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("passes the series id and type to the missing-items section", () => {
		render(<SeriesDetailsScreen />);

		const missingItems = screen.getByTestId("missing-series-items");
		expect(missingItems).toHaveAttribute(
			"data-series-id",
			String(seriesDetailsFixture.id),
		);
		expect(missingItems).toHaveAttribute(
			"data-series-type",
			seriesDetailsFixture.type,
		);
	});

	it("opens the confirmation dialog without deleting immediately", async () => {
		const { deleteSeries } = await import(
			"#/features/screens/seriesDetails/seriesDetails"
		);
		render(<SeriesDetailsScreen />);

		clickDeleteSeries();

		expect(screen.getByText("seriesDetails.deleteTitle")).toBeInTheDocument();
		expect(deleteSeries).not.toHaveBeenCalled();
	});

	it("closes the dialog without deleting when cancel is clicked", async () => {
		const { deleteSeries } = await import(
			"#/features/screens/seriesDetails/seriesDetails"
		);
		render(<SeriesDetailsScreen />);

		clickDeleteSeries();
		cancelDelete();

		expect(
			screen.queryByText("seriesDetails.deleteTitle"),
		).not.toBeInTheDocument();
		expect(deleteSeries).not.toHaveBeenCalled();
	});

	it("deletes the series and navigates home when confirmed", async () => {
		const { deleteSeries } = await import(
			"#/features/screens/seriesDetails/seriesDetails"
		);
		vi.mocked(deleteSeries).mockResolvedValue();
		render(<SeriesDetailsScreen />);

		clickDeleteSeries();
		confirmDelete();

		await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/" }));
		expect(deleteSeries).toHaveBeenCalledWith({ data: { seriesId: 12 } });
	});

	it("shows an error and does not navigate when the delete fails", async () => {
		const { deleteSeries } = await import(
			"#/features/screens/seriesDetails/seriesDetails"
		);
		vi.mocked(deleteSeries).mockRejectedValue(new Error("network down"));
		render(<SeriesDetailsScreen />);

		clickDeleteSeries();
		confirmDelete();

		await vi.waitFor(() =>
			expect(screen.getByRole("alert")).toBeInTheDocument(),
		);
		expect(navigate).not.toHaveBeenCalledWith({ to: "/" });
	});
});
