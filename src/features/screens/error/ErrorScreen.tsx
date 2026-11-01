import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ErrorScreenActions } from "./components/ErrorScreenActions";

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
				<ErrorScreenActions onTryAgain={reset} />
			</div>
		</div>
	);
}
