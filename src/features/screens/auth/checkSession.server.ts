import { getRequest } from "@tanstack/react-start/server";
import { auth } from "#/features/screens/auth/auth";

export async function fetchSessionUser() {
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	return session?.user ?? null;
}
