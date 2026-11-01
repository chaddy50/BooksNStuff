import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoginScreen } from "#/features/screens/auth/LoginScreen";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

const navigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: React.ReactNode }) => children,
	useRouter: () => ({ navigate }),
}));

const signInEmail = vi.fn();
const signUpEmail = vi.fn();
vi.mock("#/features/screens/auth/auth-client", () => ({
	authClient: {
		signIn: { email: (...args: unknown[]) => signInEmail(...args) },
		signUp: { email: (...args: unknown[]) => signUpEmail(...args) },
	},
}));

function fillSignIn(email: string, password: string) {
	fireEvent.change(screen.getByLabelText("auth.email"), {
		target: { value: email },
	});
	fireEvent.change(screen.getByLabelText("auth.password"), {
		target: { value: password },
	});
}

function submit() {
	fireEvent.click(screen.getByRole("button", { name: "auth.signIn" }));
}

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

describe("LoginScreen", () => {
	it("renders the sign-in form by default", () => {
		render(<LoginScreen />);

		expect(screen.getByLabelText("auth.email")).toBeInTheDocument();
		expect(screen.getByLabelText("auth.password")).toBeInTheDocument();
		expect(screen.queryByLabelText("auth.name")).not.toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "auth.signIn" }),
		).toBeInTheDocument();
	});

	it("shows the name field and sign-up submit label after switching to sign up", () => {
		render(<LoginScreen />);

		fireEvent.click(screen.getByText("auth.noAccount"));

		expect(screen.getByLabelText("auth.name")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "auth.signUp" }),
		).toBeInTheDocument();
	});

	it("signs in and navigates home on valid credentials", async () => {
		signInEmail.mockResolvedValue({ error: null });
		render(<LoginScreen />);

		fillSignIn("person@example.com", "correct-password");
		submit();

		await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/" }));
		expect(signInEmail).toHaveBeenCalledWith({
			email: "person@example.com",
			password: "correct-password",
		});
	});

	it("shows an invalid-credentials error and does not navigate when sign-in fails", async () => {
		signInEmail.mockResolvedValue({ error: { message: "nope" } });
		render(<LoginScreen />);

		fillSignIn("person@example.com", "wrong-password");
		submit();

		await vi.waitFor(() =>
			expect(screen.getByText("auth.invalidCredentials")).toBeInTheDocument(),
		);
		expect(navigate).not.toHaveBeenCalled();
	});

	it("signs up with the entered name, email, and password and navigates home", async () => {
		signUpEmail.mockResolvedValue({ error: null });
		render(<LoginScreen />);

		fireEvent.click(screen.getByText("auth.noAccount"));
		fireEvent.change(screen.getByLabelText("auth.name"), {
			target: { value: "Ada Lovelace" },
		});
		fillSignIn("ada@example.com", "new-password");
		fireEvent.click(screen.getByRole("button", { name: "auth.signUp" }));

		await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/" }));
		expect(signUpEmail).toHaveBeenCalledWith({
			name: "Ada Lovelace",
			email: "ada@example.com",
			password: "new-password",
		});
	});

	it("shows the returned error message and does not navigate when sign-up fails", async () => {
		signUpEmail.mockResolvedValue({ error: { message: "email taken" } });
		render(<LoginScreen />);

		fireEvent.click(screen.getByText("auth.noAccount"));
		fireEvent.change(screen.getByLabelText("auth.name"), {
			target: { value: "Ada Lovelace" },
		});
		fillSignIn("ada@example.com", "new-password");
		fireEvent.click(screen.getByRole("button", { name: "auth.signUp" }));

		await vi.waitFor(() =>
			expect(screen.getByText("email taken")).toBeInTheDocument(),
		);
		expect(navigate).not.toHaveBeenCalled();
	});

	it("shows a generic error and does not navigate when the auth call throws", async () => {
		signInEmail.mockRejectedValue(new Error("network down"));
		render(<LoginScreen />);

		fillSignIn("person@example.com", "correct-password");
		submit();

		await vi.waitFor(() =>
			expect(screen.getByText("auth.error")).toBeInTheDocument(),
		);
		expect(navigate).not.toHaveBeenCalled();
	});

	it("shows the forgot-password link in sign-in mode but hides it in sign-up mode", () => {
		render(<LoginScreen />);

		expect(screen.getByText("auth.forgotPassword")).toBeInTheDocument();

		fireEvent.click(screen.getByText("auth.noAccount"));

		expect(screen.queryByText("auth.forgotPassword")).not.toBeInTheDocument();
	});
});
