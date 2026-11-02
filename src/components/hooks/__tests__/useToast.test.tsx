import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "#/components/hooks/useToast";

function ToastTrigger() {
	const { toast } = useToast();
	return (
		<button
			type="button"
			onClick={() => toast("Something failed", { variant: "destructive" })}
		>
			Trigger
		</button>
	);
}

function ReadToastOutsideProvider() {
	useToast();
	return null;
}

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("useToast", () => {
	it("throws when used outside a ToastProvider", () => {
		expect(() => render(<ReadToastOutsideProvider />)).toThrow(/ToastProvider/);
	});

	it("calling toast makes a toast containing that text appear in the DOM", () => {
		render(
			<ToastProvider>
				<ToastTrigger />
			</ToastProvider>,
		);

		fireEvent.click(screen.getByText("Trigger"));

		expect(screen.getByText("Something failed")).toBeInTheDocument();
	});

	it("removes a rendered toast from the DOM after its duration elapses", () => {
		vi.useFakeTimers();
		render(
			<ToastProvider>
				<ToastTrigger />
			</ToastProvider>,
		);

		fireEvent.click(screen.getByText("Trigger"));
		expect(screen.getByText("Something failed")).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(5000);
		});

		expect(screen.queryByText("Something failed")).not.toBeInTheDocument();
	});
});
