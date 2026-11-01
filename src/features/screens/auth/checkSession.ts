import { createServerFn } from "@tanstack/react-start";
import { fetchSessionUser } from "#/features/screens/auth/checkSession.server";

export const checkSession = createServerFn({ method: "GET" }).handler(
	fetchSessionUser,
);
