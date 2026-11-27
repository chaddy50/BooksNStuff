import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useIsMobile } from "#/components/hooks/useIsMobile";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

interface DeleteButtonProps {
	onClick: () => void;
	disabled?: boolean;
	className?: string;
	children: ReactNode;
}

export function DeleteButton({
	onClick,
	disabled,
	className,
	children,
}: DeleteButtonProps) {
	const isMobile = useIsMobile();

	return (
		<Button
			variant="ghost"
			size="sm"
			className={cn(
				"group/trash text-muted-foreground hover:text-white hover:bg-destructive dark:hover:bg-destructive/60 overflow-hidden transition-all duration-200",
				isMobile ? "gap-1.5" : "gap-0",
				className,
			)}
			onClick={onClick}
			disabled={disabled}
		>
			<Trash2 className="size-4 shrink-0" />
			<span
				className={cn(
					"overflow-hidden whitespace-nowrap transition-all duration-200",
					isMobile
						? "max-w-50"
						: "max-w-0 group-hover/trash:max-w-50 group-hover/trash:ml-1.5",
				)}
			>
				{children}
			</span>
		</Button>
	);
}
