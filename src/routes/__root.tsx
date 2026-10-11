import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import { ThemeProvider } from "#/components/hooks/useTheme";
import { TooltipProvider } from "#/components/ui/tooltip";
import { buildThemeInitScript } from "#/lib/theme/theme";
import "../i18n";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import TanStackQueryProvider from "../integrations/tanstack-query/root-provider";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	notFoundComponent: () => <p>Page not found</p>,
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Media Tracker",
			},
			{
				name: "mobile-web-app-capable",
				content: "yes",
			},
			{
				name: "apple-mobile-web-app-capable",
				content: "yes",
			},
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "default",
			},
			{
				name: "apple-mobile-web-app-title",
				content: "Media Tracker",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "manifest",
				href: "/manifest.json",
			},
			{
				rel: "apple-touch-icon",
				href: "/logo192.png",
			},
		],
		scripts: [
			{
				children: buildThemeInitScript(),
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		if (!("serviceWorker" in navigator)) {
			return;
		}

		if (import.meta.env.PROD) {
			void navigator.serviceWorker.register("/sw.js", { scope: "/" });
			return;
		}

		// VitePWA only emits /sw.js for production builds, so registering it here
		// threw a 404 on every dev page load. Worse, a worker installed by an
		// earlier production build keeps controlling localhost and serves its
		// precached bundle over the dev server — the page paints correctly, then
		// the stale assets take over. Clear them out instead.
		void navigator.serviceWorker.getRegistrations().then((registrations) => {
			for (const registration of registrations) {
				void registration.unregister();
			}
		});
	}, []);

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<AppProviders>
					{children}
					<TanStackDevtools
						config={{
							position: "bottom-right",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
							TanStackQueryDevtools,
						]}
					/>
				</AppProviders>
				<Scripts />
			</body>
		</html>
	);
}

function AppProviders({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider>
			<TanStackQueryProvider>
				<TooltipProvider>{children}</TooltipProvider>
			</TanStackQueryProvider>
		</ThemeProvider>
	);
}
