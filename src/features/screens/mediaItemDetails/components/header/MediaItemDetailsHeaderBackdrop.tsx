import type { ReactNode } from "react";

interface MediaItemDetailsHeaderBackdropProps {
	children: ReactNode;
}

export function MediaItemDetailsHeaderBackdrop(
	props: MediaItemDetailsHeaderBackdropProps,
) {
	const { children } = props;

	return (
		<div className="rounded-lg border border-border bg-card p-4 md:p-8">
			{children}
		</div>
	);
}
