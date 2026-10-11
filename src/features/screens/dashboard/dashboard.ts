import { createServerFn } from "@tanstack/react-start";
import { getLoggedInUser } from "#/features/screens/auth/session";
import { fetchDashboardData } from "#/features/screens/dashboard/dashboard.server";

export const getDashboardData = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getLoggedInUser();
		return fetchDashboardData(user.id);
	},
);

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
// `progressPercent` only ever comes back on `inProgressItems` — the other two
// sections can never hold an IN_PROGRESS item, so it stays optional here.
export type DashboardItem = Omit<
	DashboardData["inProgressItems"][number],
	"progressPercent"
> & {
	progressPercent?: number | null;
};
