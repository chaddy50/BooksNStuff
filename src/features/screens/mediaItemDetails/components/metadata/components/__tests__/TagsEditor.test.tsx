import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TagsEditor } from "../TagsEditor";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-query", () => ({
	useQuery: () => ({
		data: [
			{ id: 1, name: "fantasy" },
			{ id: 2, name: "fiction" },
		],
	}),
}));

vi.mock("#/lib/tags", () => ({ getTags: vi.fn() }));

afterEach(cleanup);

describe("TagsEditor", () => {
	it("highlights the first suggestion when pressing ArrowDown", () => {
		render(<TagsEditor pendingTags={[]} onPendingTagsChange={vi.fn()} />);

		const input = screen.getByPlaceholderText("mediaItem.addTag");
		fireEvent.change(input, { target: { value: "fi" } });
		fireEvent.keyDown(input, { key: "ArrowDown" });

		expect(screen.getByRole("button", { name: "fiction" })).toHaveClass(
			"bg-accent",
		);
	});

	it("wraps the highlight to the first suggestion after the last", () => {
		render(<TagsEditor pendingTags={[]} onPendingTagsChange={vi.fn()} />);

		const input = screen.getByPlaceholderText("mediaItem.addTag");
		fireEvent.change(input, { target: { value: "f" } });
		fireEvent.keyDown(input, { key: "ArrowDown" });
		fireEvent.keyDown(input, { key: "ArrowDown" });
		fireEvent.keyDown(input, { key: "ArrowDown" });

		expect(screen.getByRole("button", { name: "fantasy" })).toHaveClass(
			"bg-accent",
		);
	});

	it("moves the highlight backward and wraps with ArrowUp", () => {
		render(<TagsEditor pendingTags={[]} onPendingTagsChange={vi.fn()} />);

		const input = screen.getByPlaceholderText("mediaItem.addTag");
		fireEvent.change(input, { target: { value: "f" } });
		fireEvent.keyDown(input, { key: "ArrowUp" });

		expect(screen.getByRole("button", { name: "fiction" })).toHaveClass(
			"bg-accent",
		);
	});

	it("adds the highlighted suggestion and keeps focus in the input on Enter", () => {
		const onPendingTagsChange = vi.fn();
		render(
			<TagsEditor pendingTags={[]} onPendingTagsChange={onPendingTagsChange} />,
		);

		const input = screen.getByPlaceholderText("mediaItem.addTag");
		fireEvent.change(input, { target: { value: "fi" } });
		fireEvent.keyDown(input, { key: "ArrowDown" });
		fireEvent.keyDown(input, { key: "Enter" });

		expect(onPendingTagsChange).toHaveBeenCalledWith(["fiction"]);
		expect(input).toHaveFocus();
	});

	it("keeps the suggestion dropdown open after selecting a suggestion with Enter", () => {
		render(<TagsEditor pendingTags={[]} onPendingTagsChange={vi.fn()} />);

		const input = screen.getByPlaceholderText("mediaItem.addTag");
		fireEvent.change(input, { target: { value: "fi" } });
		fireEvent.keyDown(input, { key: "ArrowDown" });
		fireEvent.keyDown(input, { key: "Enter" });

		expect(screen.getByRole("button", { name: "fantasy" })).toBeInTheDocument();
	});

	it("adds the typed text as a tag on Enter when no suggestion is highlighted", () => {
		const onPendingTagsChange = vi.fn();
		render(
			<TagsEditor pendingTags={[]} onPendingTagsChange={onPendingTagsChange} />,
		);

		const input = screen.getByPlaceholderText("mediaItem.addTag");
		fireEvent.change(input, { target: { value: "brand new tag" } });
		fireEvent.keyDown(input, { key: "Enter" });

		expect(onPendingTagsChange).toHaveBeenCalledWith(["brand new tag"]);
	});
});
