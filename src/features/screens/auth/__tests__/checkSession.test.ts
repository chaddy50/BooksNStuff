import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start/server", () => ({
	getRequest: () => ({ headers: new Headers() }),
}));

const getSession = vi.fn();
vi.mock("#/features/screens/auth/auth", () => ({
	auth: { api: { getSession } },
}));

describe("fetchSessionUser", () => {
	it("returns the session's user when a session exists", async () => {
		const { fetchSessionUser } = await import(
			"#/features/screens/auth/checkSession.server"
		);
		getSession.mockResolvedValue({ user: { id: "user-a", email: "a@b.com" } });

		await expect(fetchSessionUser()).resolves.toEqual({
			id: "user-a",
			email: "a@b.com",
		});
	});

	it("returns null when there is no session", async () => {
		const { fetchSessionUser } = await import(
			"#/features/screens/auth/checkSession.server"
		);
		getSession.mockResolvedValue(null);

		await expect(fetchSessionUser()).resolves.toBeNull();
	});
});
