import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MediaItemDetailsTabStrip } from "../MediaItemDetailsTabStrip";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

describe("MediaItemDetailsTabStrip", () => {
	it("renders a tab for overview, history, and related", () => {
		render(
			<MediaItemDetailsTabStrip activeTabId="overview" onSelect={vi.fn()} />,
		);

		expect(
			screen.getByRole("tab", { name: "mediaItemDetails.overview" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("tab", { name: "mediaItemDetails.history" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("tab", { name: "relatedItems.title" }),
		).toBeInTheDocument();
	});

	it("marks the active tab as selected", () => {
		render(
			<MediaItemDetailsTabStrip activeTabId="history" onSelect={vi.fn()} />,
		);

		expect(
			screen.getByRole("tab", { name: "mediaItemDetails.history" }),
		).toHaveAttribute("aria-selected", "true");
		expect(
			screen.getByRole("tab", { name: "mediaItemDetails.overview" }),
		).toHaveAttribute("aria-selected", "false");
	});

	it("calls onSelect with the clicked tab's id", () => {
		const onSelect = vi.fn();
		render(
			<MediaItemDetailsTabStrip activeTabId="overview" onSelect={onSelect} />,
		);

		fireEvent.click(screen.getByRole("tab", { name: "relatedItems.title" }));

		expect(onSelect).toHaveBeenCalledWith("related");
	});
});
