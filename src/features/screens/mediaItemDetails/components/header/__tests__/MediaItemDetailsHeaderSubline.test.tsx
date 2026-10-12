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
		metadata: {},
		releaseDate: "2019-01-01",
		genreId: 3,
		genreName: "Sci-Fi",
		...overrides,
	} as unknown as Parameters<
		typeof MediaItemDetailsHeaderSubline
	>[0]["mediaItemDetails"];
}

afterEach(cleanup);

describe("MediaItemDetailsHeaderSubline", () => {
	it("renders the genre and release year, dot-separated, genre first", () => {
		render(
			<MediaItemDetailsHeaderSubline
				mediaItemDetails={makeMediaItemDetails()}
			/>,
		);

		expect(screen.getByText("Sci-Fi")).toBeInTheDocument();
		expect(screen.getByText("2019")).toBeInTheDocument();

		const text =
			screen.getByTestId("media-item-details-header-subline").textContent ?? "";
		expect(text.indexOf("Sci-Fi")).toBeLessThan(text.indexOf("2019"));
	});

	it("links the genre to its genre page", () => {
		render(
			<MediaItemDetailsHeaderSubline
				mediaItemDetails={makeMediaItemDetails()}
			/>,
		);

		expect(screen.getByRole("link", { name: "Sci-Fi" })).toHaveAttribute(
			"href",
			"/genre/3",
		);
	});

	it("omits missing segments instead of leaving empty dots", () => {
		render(
			<MediaItemDetailsHeaderSubline
				mediaItemDetails={makeMediaItemDetails({
					genreId: null,
					genreName: null,
				})}
			/>,
		);

		expect(screen.queryByText("Sci-Fi")).not.toBeInTheDocument();
		expect(screen.getByText("2019")).toBeInTheDocument();
	});

	it("uses theme-aware full-strength text instead of a hardcoded white color", () => {
		render(
			<MediaItemDetailsHeaderSubline
				mediaItemDetails={makeMediaItemDetails()}
			/>,
		);

		expect(screen.getByTestId("media-item-details-header-subline")).toHaveClass(
			"text-foreground",
		);
		expect(
			screen.getByTestId("media-item-details-header-subline"),
		).not.toHaveClass("text-white/80", "text-muted-foreground");
	});

	it("renders nothing when there is no genre or release year", () => {
		const { container } = render(
			<MediaItemDetailsHeaderSubline
				mediaItemDetails={makeMediaItemDetails({
					genreId: null,
					genreName: null,
					releaseDate: null,
				})}
			/>,
		);

		expect(container).toBeEmptyDOMElement();
	});
});
