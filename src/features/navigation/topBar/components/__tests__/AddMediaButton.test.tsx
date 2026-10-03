import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddMediaButton } from "#/features/navigation/topBar/components/AddMediaButton";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("#/features/mediaItemSearch/MediaItemSearchPopup", () => ({
	SearchPopup: () => null,
}));

afterEach(cleanup);

describe("AddMediaButton", () => {
	it("grows its tap target below md", () => {
		render(<AddMediaButton />);

		expect(screen.getByRole("button")).toHaveClass(
			"max-sm:size-11",
			"max-md:h-11",
		);
	});
});
