import { useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Home } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "#/components/ui/button";
import { AddMediaButton } from "./components/AddMediaButton";

interface TopBarProps {
	shouldShowBackButton?: boolean;
	right?: React.ReactNode;
	title?: string;
	below?: React.ReactNode;
}

export function TopBar({
	shouldShowBackButton,
	right,
	title,
	below,
}: TopBarProps) {
	const { t } = useTranslation();
	const router = useRouter();
	const navigate = useNavigate();

	return (
		<header className="border-b border-border sticky top-0 z-10 bg-background">
			<div className="px-3 py-2 md:px-6 md:py-4 flex flex-wrap items-center gap-2">
				<span className="flex items-center gap-1">
					{shouldShowBackButton && (
						<>
							<Button
								variant="outline"
								size="icon"
								onClick={() => router.history.back()}
							>
								<ArrowLeft className="size-4" />
								<span className="sr-only">{t("nav.back")}</span>
							</Button>
							<Button
								variant="outline"
								size="icon"
								onClick={() => navigate({ to: "/" })}
							>
								<Home className="size-4" />
								<span className="sr-only">{t("nav.home")}</span>
							</Button>
						</>
					)}
				</span>
				{title ? (
					<span className="flex-1 min-w-0 flex md:justify-center pointer-events-none">
						<h1 className="text-xl md:text-2xl font-bold truncate">{title}</h1>
					</span>
				) : (
					<span className="flex-1" />
				)}
				<span className="flex items-center gap-1 md:gap-2 md:order-last">
					<AddMediaButton />
				</span>
				{right && (
					<div className="w-full md:w-auto flex items-center gap-2">
						{right}
					</div>
				)}
			</div>
			{below}
		</header>
	);
}
