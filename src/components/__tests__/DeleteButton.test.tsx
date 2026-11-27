import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeleteButton } from "#/components/DeleteButton";

let isMobile = false;

vi.mock("#/components/hooks/useIsMobile", () => ({
	useIsMobile: () => isMobile,
}));

afterEach(() => {
	cleanup();
	isMobile = false;
});

describe("DeleteButton", () => {
	it("keeps the label collapsed until hover on desktop", () => {
		render(<DeleteButton onClick={vi.fn()}>Remove</DeleteButton>);

		const label = screen.getByText("Remove");
		expect(label.className).toContain("max-w-0");
	});

	it("always shows the full label on mobile, since there is no hover", () => {
		isMobile = true;
		render(<DeleteButton onClick={vi.fn()}>Remove</DeleteButton>);

		const label = screen.getByText("Remove");
		expect(label.className).not.toContain("max-w-0");
	});
});
