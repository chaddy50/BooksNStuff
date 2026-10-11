interface InitialsAvatarProps {
	name: string;
}

export function InitialsAvatar({ name }: InitialsAvatarProps) {
	return (
		<div
			aria-hidden="true"
			className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground"
		>
			{getInitials(name)}
		</div>
	);
}

function getInitials(name: string): string {
	const segments = name.split(/\s+/).filter((segment) => segment.length > 0);

	if (segments.length === 1) {
		return segments[0].slice(0, 2).toUpperCase();
	}

	const first = segments[0];
	const last = segments[segments.length - 1];
	return `${first[0]}${last[0]}`.toUpperCase();
}
