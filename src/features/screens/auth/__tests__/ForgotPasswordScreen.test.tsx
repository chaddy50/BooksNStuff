import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ForgotPasswordScreen } from "#/features/screens/auth/ForgotPasswordScreen";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => children,
}));

const requestPasswordReset = vi.fn();
vi.mock("#/features/screens/auth/auth-client", () => ({
	authClient: {
		requestPasswordReset: (...args: unknown[]) => requestPasswordReset(...args),
	},
}));

function submitEmail(email: string) {
	fireEvent.change(screen.getByLabelText("auth.email"), {
		target: { value: email },
	});
	fireEvent.click(
		screen.getByRole("button", { name: "auth.forgotPasswordSubmit" }),
	);
}

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("ForgotPasswordScreen", () => {
	it("requests a password reset for the entered email", async () => {
		requestPasswordReset.mockImplementation(() => Promise.resolve());
		render(<ForgotPasswordScreen />);

		submitEmail("person@example.com");

		await vi.waitFor(() =>
			expect(requestPasswordReset).toHaveBeenCalledWith({
				email: "person@example.com",
				redirectTo: "/reset-password",
			}),
		);
	});

	it("shows the sent confirmation after a successful submit", async () => {
		requestPasswordReset.mockImplementation(() => Promise.resolve());
		render(<ForgotPasswordScreen />);

		submitEmail("person@example.com");

		await vi.waitFor(() =>
			expect(screen.getByText("auth.forgotPasswordSent")).toBeInTheDocument(),
		);
	});

	it("shows the same sent confirmation even when the request fails", async () => {
		requestPasswordReset.mockRejectedValue(new Error("network down"));
		render(<ForgotPasswordScreen />);

		submitEmail("person@example.com");

		await vi.waitFor(() =>
			expect(screen.getByText("auth.forgotPasswordSent")).toBeInTheDocument(),
		);
	});
});
