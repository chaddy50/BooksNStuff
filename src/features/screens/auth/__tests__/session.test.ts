import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start/server", () => ({
	getRequest: () => ({ headers: new Headers() }),
}));

const getSession = vi.fn();
vi.mock("#/features/screens/auth/auth", () => ({
	auth: { api: { getSession } },
}));

describe("getLoggedInUser", () => {
	it("returns the session's user when a session exists", async () => {
		const { getLoggedInUser } = await import("#/features/screens/auth/session");
		getSession.mockResolvedValue({ user: { id: "user-a", email: "a@b.com" } });

		await expect(getLoggedInUser()).resolves.toEqual({
			id: "user-a",
			email: "a@b.com",
		});
	});

	it("throws when there is no session", async () => {
		const { getLoggedInUser } = await import("#/features/screens/auth/session");
		getSession.mockResolvedValue(null);

		await expect(getLoggedInUser()).rejects.toThrow("Unauthorized");
	});
});
