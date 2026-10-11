import { InitialsAvatar } from "#/components/InitialsAvatar";

interface CreatorAvatarProps {
	name: string;
	portraitUrl?: string | null;
}

export function CreatorAvatar({ name, portraitUrl }: CreatorAvatarProps) {
	if (portraitUrl) {
		return (
			<img
				src={portraitUrl}
				alt={name}
				className="size-14 shrink-0 rounded-full object-cover"
			/>
		);
	}

	return <InitialsAvatar name={name} />;
}
