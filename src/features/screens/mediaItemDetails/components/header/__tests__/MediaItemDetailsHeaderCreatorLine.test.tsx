import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/lib/enums";
import { MediaItemDetailsHeaderCreatorLine } from "../MediaItemDetailsHeaderCreatorLine";

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
): Parameters<typeof MediaItemDetailsHeaderCreatorLine>[0]["mediaItemDetails"] {
	return {
		type: MediaItemType.BOOK,
		metadata: { author: "Arkady Martine", seriesBookNumber: "1" },
		seriesId: 5,
		seriesName: "Teixcalaan",
		creatorId: 9,
		creatorName: "Arkady Martine",
		...overrides,
	} as unknown as Parameters<
		typeof MediaItemDetailsHeaderCreatorLine
	>[0]["mediaItemDetails"];
}

afterEach(cleanup);

describe("MediaItemDetailsHeaderCreatorLine", () => {
	it("renders the creator and series with book number, dot-separated, in that order", () => {
		render(
			<MediaItemDetailsHeaderCreatorLine
				mediaItemDetails={makeMediaItemDetails()}
			/>,
		);

		expect(screen.getByText("Arkady Martine")).toBeInTheDocument();
		expect(screen.getByText("Teixcalaan #1")).toBeInTheDocument();

		const text =
			screen.getByTestId("media-item-details-header-creator-line")
				.textContent ?? "";
		expect(text.indexOf("Arkady Martine")).toBeLessThan(
			text.indexOf("Teixcalaan #1"),
		);
	});

	it("links the creator when a creatorId is known", () => {
		render(
			<MediaItemDetailsHeaderCreatorLine
				mediaItemDetails={makeMediaItemDetails()}
			/>,
		);

		expect(
			screen.getByRole("link", { name: "Arkady Martine" }),
		).toHaveAttribute("href", "/creator/9");
	});

	it("links the series when a seriesId is known", () => {
		render(
			<MediaItemDetailsHeaderCreatorLine
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
			<MediaItemDetailsHeaderCreatorLine
				mediaItemDetails={makeMediaItemDetails({
					seriesId: null,
					seriesName: null,
				})}
			/>,
		);

		expect(screen.queryByText("Teixcalaan #1")).not.toBeInTheDocument();
		expect(screen.getByText("Arkady Martine")).toBeInTheDocument();
	});

	it("renders nothing when there is no creator or series", () => {
		const { container } = render(
			<MediaItemDetailsHeaderCreatorLine
				mediaItemDetails={makeMediaItemDetails({
					metadata: {},
					seriesId: null,
					seriesName: null,
				})}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});
});
