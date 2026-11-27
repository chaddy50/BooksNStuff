import type { ReactNode } from "react";

interface SectionLabelProps {
	children: ReactNode;
}

export function SectionLabel({ children }: SectionLabelProps) {
	return (
		<h2 className="text-base text-muted-foreground font-medium uppercase tracking-wide">
			{children}
		</h2>
	);
}
