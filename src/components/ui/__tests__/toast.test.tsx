import { cleanup, render, screen } from "@testing-library/react";
import { Toast as ToastPrimitive } from "radix-ui";
import { afterEach, describe, expect, it } from "vitest";
import { Toast, ToastViewport } from "#/components/ui/toast";

afterEach(() => {
	cleanup();
});

describe("Toast", () => {
	it("applies the destructive variant's background styling to the rendered root element", () => {
		render(
			<ToastPrimitive.Provider>
				<Toast open variant="destructive">
					Something failed
				</Toast>
				<ToastViewport />
			</ToastPrimitive.Provider>,
		);

		const toastRoot = screen
			.getByText("Something failed")
			.closest("[data-slot='toast']");

		expect(toastRoot).toHaveAttribute("data-variant", "destructive");
		expect(toastRoot).toHaveClass("bg-destructive");
	});
});
