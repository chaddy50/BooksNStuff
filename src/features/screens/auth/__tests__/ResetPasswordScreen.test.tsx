import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ResetPasswordScreen } from "#/features/screens/auth/ResetPasswordScreen";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

let token: string | undefined;
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	getRouteApi: () => ({ useSearch: () => ({ token }) }),
}));

const resetPassword = vi.fn();
vi.mock("#/features/screens/auth/auth-client", () => ({
	authClient: {
		resetPassword: (...args: unknown[]) => resetPassword(...args),
	},
}));

function fillPasswords(newPassword: string, confirmPassword: string) {
	fireEvent.change(screen.getByLabelText("auth.newPassword"), {
		target: { value: newPassword },
	});
	fireEvent.change(screen.getByLabelText("auth.confirmPassword"), {
		target: { value: confirmPassword },
	});
}

function submit() {
	fireEvent.click(
		screen.getByRole("button", { name: "auth.resetPasswordSubmit" }),
	);
}

afterEach(cleanup);
beforeEach(() => {
	vi.clearAllMocks();
	token = "valid-token";
});

describe("ResetPasswordScreen", () => {
	it("shows an invalid-token message and no form when there is no token", () => {
		token = undefined;
		render(<ResetPasswordScreen />);

		expect(
			screen.getByText("auth.resetPasswordInvalidToken"),
		).toBeInTheDocument();
		expect(screen.getByText("auth.forgotPassword")).toBeInTheDocument();
		expect(screen.queryByLabelText("auth.newPassword")).not.toBeInTheDocument();
	});

	it("shows a mismatch error and does not call resetPassword when passwords differ", () => {
		render(<ResetPasswordScreen />);

		fillPasswords("password-one", "password-two");
		submit();

		expect(screen.getByText("auth.passwordMismatch")).toBeInTheDocument();
		expect(resetPassword).not.toHaveBeenCalled();
	});

	it("resets the password and shows the success message", async () => {
		resetPassword.mockResolvedValue({ error: null });
		render(<ResetPasswordScreen />);

		fillPasswords("new-password", "new-password");
		submit();

		await vi.waitFor(() =>
			expect(screen.getByText("auth.resetPasswordSuccess")).toBeInTheDocument(),
		);
		expect(resetPassword).toHaveBeenCalledWith({
			newPassword: "new-password",
			token: "valid-token",
		});
	});

	it("shows the invalid-token message when resetPassword returns an error", async () => {
		resetPassword.mockResolvedValue({ error: { message: "expired" } });
		render(<ResetPasswordScreen />);

		fillPasswords("new-password", "new-password");
		submit();

		await vi.waitFor(() =>
			expect(
				screen.getByText("auth.resetPasswordInvalidToken"),
			).toBeInTheDocument(),
		);
		expect(
			screen.queryByText("auth.resetPasswordSuccess"),
		).not.toBeInTheDocument();
	});

	it("shows a generic error when resetPassword throws", async () => {
		resetPassword.mockRejectedValue(new Error("network down"));
		render(<ResetPasswordScreen />);

		fillPasswords("new-password", "new-password");
		submit();

		await vi.waitFor(() =>
			expect(screen.getByText("auth.error")).toBeInTheDocument(),
		);
	});
});
