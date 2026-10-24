import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProgressBar } from "#/components/ProgressBar";
import { MediaItemStatus } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({
		t: (key: string, options?: Record<string, unknown>) =>
			options ? `${key}:${JSON.stringify(options)}` : key,
	}),
}));

afterEach(cleanup);

describe("ProgressBar", () => {
	it("rounds a fractional percent in its aria-label", () => {
		render(
			<ProgressBar
				status={MediaItemStatus.IN_PROGRESS}
				progressPercent={46.875}
			/>,
		);

		expect(screen.getByRole("progressbar")).toHaveAttribute(
			"aria-label",
			'mediaItemDetails.progressComplete:{"percent":47}',
		);
	});
});
