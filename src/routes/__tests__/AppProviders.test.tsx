// @vitest-environment jsdom
// src/routes/** is not in the config's jsdom globs; this suite needs it.

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useToast } from "#/components/hooks/useToast";

function ToastConsumer() {
	useToast();
	return <div>toast available</div>;
}

afterEach(cleanup);

describe("AppProviders", () => {
	it("lets a component call useToast() without throwing", async () => {
		const { AppProviders } = await import("#/routes/__root");

		render(
			<AppProviders>
				<ToastConsumer />
			</AppProviders>,
		);

		expect(screen.getByText("toast available")).toBeInTheDocument();
	});
});
