import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InstanceMetaLine } from "#/features/screens/mediaItemDetails/components/InstanceMetaLine";

afterEach(cleanup);

describe("InstanceMetaLine", () => {
	it("renders each label", () => {
		render(<InstanceMetaLine labels={["Started Jan 01, 2026", "Ebook"]} />);

		expect(screen.getByText("Started Jan 01, 2026")).toBeInTheDocument();
		expect(screen.getByText("Ebook")).toBeInTheDocument();
	});

	it("shows a · separator between each label", () => {
		render(
			<InstanceMetaLine labels={["Started Jan 01, 2026", "Ebook", "42%"]} />,
		);

		expect(screen.getAllByText("·")).toHaveLength(2);
	});

	it("renders nothing when there are no labels", () => {
		const { container } = render(<InstanceMetaLine labels={[]} />);

		expect(container.querySelector("span")).not.toBeInTheDocument();
	});
});
