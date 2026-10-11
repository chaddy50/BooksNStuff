import type { ReactNode } from "react";

interface MediaItemDetailsHeaderBackdropProps {
	coverImageUrl: string | null;
	children: ReactNode;
}

export function MediaItemDetailsHeaderBackdrop(
	props: MediaItemDetailsHeaderBackdropProps,
) {
	const { coverImageUrl, children } = props;

	return (
		<div className="relative overflow-hidden rounded-lg">
			<div className="absolute inset-0 bg-muted">
				{coverImageUrl && (
					<img
						src={coverImageUrl}
						alt=""
						aria-hidden="true"
						className="w-full h-full object-cover scale-110 blur-2xl opacity-60"
					/>
				)}
				<div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-background" />
			</div>
			<div className="relative p-4 md:p-8">{children}</div>
		</div>
	);
}
