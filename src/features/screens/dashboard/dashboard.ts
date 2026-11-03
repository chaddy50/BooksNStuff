import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getLoggedInUser } from "#/features/screens/auth/session";
import {
	fetchDashboardData,
	handleReorderNextUpItems,
} from "#/features/screens/dashboard/dashboard.server";

export const getDashboardData = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getLoggedInUser();
		return fetchDashboardData(user.id);
	},
);

export const reorderNextUpItems = createServerFn({ method: "POST" })
	.inputValidator(z.object({ orderedMediaItemIds: z.array(z.number()) }))
	.handler(async ({ data: { orderedMediaItemIds } }) => {
		const user = await getLoggedInUser();
		await handleReorderNextUpItems(user.id, orderedMediaItemIds);
	});

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
// `progressPercent` only ever comes back on `inProgressItems` — the other two
// sections can never hold an IN_PROGRESS item, so it stays optional here.
export type DashboardItem = Omit<
	DashboardData["inProgressItems"][number],
	"progressPercent"
> & {
	progressPercent?: number | null;
};
