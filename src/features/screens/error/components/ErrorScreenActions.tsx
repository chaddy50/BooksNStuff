import { Link } from "@tanstack/react-router";
import { Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "#/components/ui/button";

interface ErrorScreenActionsProps {
	onTryAgain: () => void;
}

export function ErrorScreenActions({ onTryAgain }: ErrorScreenActionsProps) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col gap-2">
			<Button onClick={onTryAgain} className="w-full">
				{t("errorScreen.tryAgain")}
			</Button>
			<Button asChild variant="outline" className="w-full">
				<Link to="/">
					<Home className="size-4" />
					{t("nav.home")}
				</Link>
			</Button>
		</div>
	);
}
