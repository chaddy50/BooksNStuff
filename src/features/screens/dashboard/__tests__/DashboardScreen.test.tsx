import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "#/components/ui/tooltip";
import { DashboardScreen } from "#/features/screens/dashboard/DashboardScreen";
import type { DashboardItem } from "#/features/screens/dashboard/dashboard";
import { MediaItemStatus, MediaItemType, PurchaseStatus } from "#/lib/enums";

vi.mock("react-i18next", () => ({
	useTranslation: () => ({ t: (key: string) => key }),
}));

function makePurchasedItem(id: number, title: string): DashboardItem {
	return {
		id,
		status: MediaItemStatus.BACKLOG,
		purchaseStatus: PurchaseStatus.PURCHASED,
		title,
		type: MediaItemType.BOOK,
		coverImageUrl: null,
		seriesId: null,
		seriesName: null,
		rating: 0,
	};
}

// A purchased item in all three lists, so any leak of the new card default
// fails the two sections that must stay badge-free.
vi.mock("@tanstack/react-router", () => ({
	getRouteApi: () => ({
		useLoaderData: () => ({
			inProgressItems: [makePurchasedItem(1, "Dune")],
			nextInSeriesItems: [makePurchasedItem(2, "Dune Messiah")],
			recentlyFinishedItems: [makePurchasedItem(3, "Children of Dune")],
		}),
	}),
	Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("#/features/navigation/topBar/TopBar", () => ({ TopBar: () => null }));

function renderDashboardScreen() {
	return render(
		<TooltipProvider>
			<DashboardScreen />
		</TooltipProvider>,
	);
}

function sectionByTitle(title: string): HTMLElement {
	const section = screen.getByText(title).closest("section");
	if (!section) {
		throw new Error(`No section found for title "${title}"`);
	}
	return section;
}

afterEach(cleanup);

describe("DashboardScreen purchase badge exception", () => {
	it("shows no badge in the In Progress section", () => {
		renderDashboardScreen();

		expect(
			within(sectionByTitle("dashboard.inProgress")).queryByTestId(
				"purchased-badge",
			),
		).not.toBeInTheDocument();
	});

	it("shows the badge in the Next in Series section", () => {
		renderDashboardScreen();

		expect(
			within(sectionByTitle("dashboard.nextInSeries")).getByTestId(
				"purchased-badge",
			),
		).toBeInTheDocument();
	});

	it("shows no badge in the Recently Finished section", () => {
		renderDashboardScreen();

		expect(
			within(sectionByTitle("dashboard.recentlyFinished")).queryByTestId(
				"purchased-badge",
			),
		).not.toBeInTheDocument();
	});
});
