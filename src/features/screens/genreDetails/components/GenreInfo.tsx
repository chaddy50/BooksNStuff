import { InitialsAvatar } from "#/components/InitialsAvatar";
import { ProfileStatsRow } from "#/components/ProfileStatsRow";
import type { GenreDetails } from "#/lib/genres/genres";

interface GenreInfoProps {
	genreDetails: GenreDetails;
}

export function GenreInfo({ genreDetails }: GenreInfoProps) {
	return (
		<div className="mb-10 flex items-center gap-4">
			<InitialsAvatar name={genreDetails.name} />
			<div className="flex flex-col gap-1">
				<h1 className="text-3xl font-bold leading-tight">
					{genreDetails.name}
				</h1>
				<ProfileStatsRow stats={genreDetails.stats} />
			</div>
		</div>
	);
}
