import { useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Home } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useHeaderScrollOffset } from "#/components/hooks/useHeaderScrollOffset";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
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
	const headerRef = useRef<HTMLElement>(null);
	const [headerHeight, setHeaderHeight] = useState(0);
	const hiddenHeight = useHeaderScrollOffset(headerRef, headerHeight);

	useLayoutEffect(() => {
		const header = headerRef.current;
		if (!header) {
			return;
		}

		setHeaderHeight(header.offsetHeight);

		const observer = new ResizeObserver(() =>
			setHeaderHeight(header.offsetHeight),
		);
		observer.observe(header);
		return () => observer.disconnect();
	}, []);

	return (
		<>
			<header
				ref={headerRef}
				data-testid="top-bar-header"
				style={
					{
						"--header-hidden-height": `${-hiddenHeight}px`,
					} as React.CSSProperties
				}
				className={cn(
					"border-b border-border bg-background fixed inset-x-0 top-0 z-10",
					"translate-y-[var(--header-hidden-height)]",
					"md:sticky md:translate-y-0",
				)}
			>
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
							<h1 className="text-xl md:text-2xl font-bold truncate">
								{title}
							</h1>
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
			<div
				data-testid="top-bar-spacer"
				style={{ height: headerHeight - hiddenHeight }}
				className="md:hidden"
				aria-hidden="true"
			/>
		</>
	);
}
