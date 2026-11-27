import type { ReactNode } from "react";

interface MediaItemDetailsHeaderBackdropProps {
	children: ReactNode;
}

export function MediaItemDetailsHeaderBackdrop(
	props: MediaItemDetailsHeaderBackdropProps,
) {
	const { children } = props;

	return (
		<div className="rounded-xl border border-border bg-muted/60 shadow-sm overflow-hidden p-4 md:p-5">
			{children}
		</div>
	);
}
