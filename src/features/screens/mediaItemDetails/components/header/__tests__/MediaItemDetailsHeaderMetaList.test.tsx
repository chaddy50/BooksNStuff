import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaItemType } from "#/lib/enums";
import { MediaItemDetailsHeaderMetaList } from "../MediaItemDetailsHeaderMetaList";

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
): Parameters<typeof MediaItemDetailsHeaderMetaList>[0]["mediaItemDetails"] {
	return {
		type: MediaItemType.BOOK,
		metadata: { author: "Arkady Martine", seriesBookNumber: "1" },
		seriesId: 5,
		seriesName: "Teixcalaan",
		creatorId: 9,
		creatorName: "Arkady Martine",
		...overrides,
	} as unknown as Parameters<
		typeof MediaItemDetailsHeaderMetaList
	>[0]["mediaItemDetails"];
}

afterEach(cleanup);

describe("MediaItemDetailsHeaderMetaList", () => {
	it("renders creator before series when both are present", () => {
		render(
			<MediaItemDetailsHeaderMetaList
				mediaItemDetails={makeMediaItemDetails()}
			/>,
		);

		const text =
			screen.getByTestId("media-item-details-header-meta-list").textContent ??
			"";
		expect(text.indexOf("Arkady Martine")).toBeLessThan(
			text.indexOf("Teixcalaan #1"),
		);
	});

	it("links the creator when a creatorId is known", () => {
		render(
			<MediaItemDetailsHeaderMetaList
				mediaItemDetails={makeMediaItemDetails()}
			/>,
		);

		expect(
			screen.getByRole("link", { name: "Arkady Martine" }),
		).toHaveAttribute("href", "/creator/9");
	});

	it("links the series when a seriesId is known", () => {
		render(
			<MediaItemDetailsHeaderMetaList
				mediaItemDetails={makeMediaItemDetails()}
			/>,
		);

		expect(screen.getByRole("link", { name: "Teixcalaan #1" })).toHaveAttribute(
			"href",
			"/series/5",
		);
	});

	it("puts creator and series on their own line, with no separator dot before either", () => {
		render(
			<MediaItemDetailsHeaderMetaList
				mediaItemDetails={makeMediaItemDetails()}
			/>,
		);

		const creator = screen.getByRole("link", { name: "Arkady Martine" });
		const series = screen.getByRole("link", { name: "Teixcalaan #1" });
		expect(creator.closest("span")).toHaveClass("basis-full");
		expect(series.closest("span")).toHaveClass("basis-full");
		expect(
			screen.getByTestId("media-item-details-header-meta-list").textContent,
		).not.toMatch(/·\s*Arkady Martine|·\s*Teixcalaan/);
	});

	it("renders nothing when neither creator nor series are present", () => {
		const { container } = render(
			<MediaItemDetailsHeaderMetaList
				mediaItemDetails={makeMediaItemDetails({
					metadata: {},
					creatorId: null,
					creatorName: null,
					seriesId: null,
					seriesName: null,
				})}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});
});
