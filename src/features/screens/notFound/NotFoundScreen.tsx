import { Link } from "@tanstack/react-router";
import { Compass, Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/ui/button";

export function NotFoundScreen() {
	const { t } = useTranslation();

	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="w-full max-w-sm space-y-6 p-8 rounded-lg border border-border bg-card shadow-sm text-center">
				<Compass className="size-10 mx-auto text-muted-foreground" />
				<div className="space-y-1.5">
					<h1 className="text-2xl font-bold">{t("notFound.title")}</h1>
					<p className="text-sm text-muted-foreground">
						{t("notFound.description")}
					</p>
				</div>
				<Button asChild className="w-full">
					<Link to="/">
						<Home className="size-4" />
						{t("nav.home")}
					</Link>
				</Button>
			</div>
		</div>
	);
}
