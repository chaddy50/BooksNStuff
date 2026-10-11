import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/lib/enums";
import { MediaItemDetailsHeaderSubline } from "../MediaItemDetailsHeaderSubline";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		to,
		params,
		children,
	}: {
		to: string;
		params: Record<string, string>;
		children: React.ReactNode;
	}) => (
		<a href={to.replace(/\$(\w+)/g, (_, name) => params[name])}>{children}</a>
	),
}));

function makeMediaItemDetails(
	overrides: Record<string, unknown> = {},
): Parameters<typeof MediaItemDetailsHeaderSubline>[0]["mediaItemDetails"] {
	return {
		type: MediaItemType.BOOK,
		metadata: { author: "Arkady Martine", seriesBookNumber: "1" },
		releaseDate: "2019-01-01",
		seriesId: 5,
		seriesName: "Teixcalaan",
		creatorId: 9,
		creatorName: "Arkady Martine",
		...overrides,
	} as unknown as Parameters<
		typeof MediaItemDetailsHeaderSubline
	>[0]["mediaItemDetails"];
}

afterEach(cleanup);

describe("MediaItemDetailsHeaderSubline", () => {
	it("renders the release year, creator, and series with book number, dot-separated, in that order", () => {
		render(
			<MediaItemDetailsHeaderSubline
				mediaItemDetails={makeMediaItemDetails()}
			/>,
		);

		expect(screen.getByText("2019")).toBeInTheDocument();
		expect(screen.getByText("Arkady Martine")).toBeInTheDocument();
		expect(screen.getByText("Teixcalaan #1")).toBeInTheDocument();

		const text =
			screen.getByTestId("media-item-details-header-subline").textContent ?? "";
		expect(text.indexOf("2019")).toBeLessThan(text.indexOf("Arkady Martine"));
		expect(text.indexOf("Arkady Martine")).toBeLessThan(
			text.indexOf("Teixcalaan #1"),
		);
	});

	it("links the creator when a creatorId is known", () => {
		render(
			<MediaItemDetailsHeaderSubline
				mediaItemDetails={makeMediaItemDetails()}
			/>,
		);

		expect(
			screen.getByRole("link", { name: "Arkady Martine" }),
		).toHaveAttribute("href", "/creator/9");
	});

	it("links the series when a seriesId is known", () => {
		render(
			<MediaItemDetailsHeaderSubline
				mediaItemDetails={makeMediaItemDetails()}
			/>,
		);

		expect(screen.getByRole("link", { name: "Teixcalaan #1" })).toHaveAttribute(
			"href",
			"/series/5",
		);
	});

	it("omits missing segments instead of leaving empty dots", () => {
		render(
			<MediaItemDetailsHeaderSubline
				mediaItemDetails={makeMediaItemDetails({
					seriesId: null,
					seriesName: null,
				})}
			/>,
		);

		expect(screen.queryByText("Teixcalaan #1")).not.toBeInTheDocument();
		expect(screen.getByText("Arkady Martine")).toBeInTheDocument();
		expect(screen.getByText("2019")).toBeInTheDocument();
	});

	it("renders nothing when there is no creator, series, or year", () => {
		const { container } = render(
			<MediaItemDetailsHeaderSubline
				mediaItemDetails={makeMediaItemDetails({
					metadata: {},
					seriesId: null,
					seriesName: null,
					releaseDate: null,
				})}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});
});
