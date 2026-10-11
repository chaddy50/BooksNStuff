import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CreatorAvatar } from "#/components/CreatorAvatar";

afterEach(cleanup);

describe("CreatorAvatar", () => {
	it("renders a portrait image when given a portraitUrl", () => {
		render(
			<CreatorAvatar
				name="N.K. Jemisin"
				portraitUrl="http://example.test/portrait.jpg"
			/>,
		);

		const image = screen.getByRole("img", { name: "N.K. Jemisin" });
		expect(image).toHaveAttribute("src", "http://example.test/portrait.jpg");
	});

	it("falls back to initials when no portraitUrl is given", () => {
		render(<CreatorAvatar name="N.K. Jemisin" />);

		expect(screen.getByText("NJ")).toBeInTheDocument();
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});

	it("falls back to initials when portraitUrl is null", () => {
		render(<CreatorAvatar name="N.K. Jemisin" portraitUrl={null} />);

		expect(screen.getByText("NJ")).toBeInTheDocument();
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});
});
