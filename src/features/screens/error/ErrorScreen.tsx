import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Home, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/ui/button";

export function ErrorScreen({ reset }: ErrorComponentProps) {
	const { t } = useTranslation();

	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="w-full max-w-sm space-y-6 p-8 rounded-lg border border-border bg-card shadow-sm text-center">
				<TriangleAlert className="size-10 mx-auto text-destructive" />
				<div className="space-y-1.5">
					<h1 className="text-2xl font-bold">{t("errorScreen.title")}</h1>
					<p className="text-sm text-muted-foreground">
						{t("errorScreen.description")}
					</p>
				</div>
				<div className="flex flex-col gap-2">
					<Button onClick={reset} className="w-full">
						{t("errorScreen.tryAgain")}
					</Button>
					<Button asChild variant="outline" className="w-full">
						<Link to="/">
							<Home className="size-4" />
							{t("nav.home")}
						</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
