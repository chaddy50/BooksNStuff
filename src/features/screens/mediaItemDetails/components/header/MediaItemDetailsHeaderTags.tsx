interface MediaItemDetailsHeaderTagsProps {
	tags: string[];
}

export function MediaItemDetailsHeaderTags(
	props: MediaItemDetailsHeaderTagsProps,
) {
	const { tags } = props;
	if (tags.length === 0) return null;

	return (
		<div
			className="flex flex-wrap gap-1.5"
			data-testid="media-item-details-header-tags"
		>
			{tags.map((tag) => (
				<span
					key={tag}
					className="px-2 py-0.5 rounded-full bg-white/15 text-white text-xs"
				>
					{tag}
				</span>
			))}
		</div>
	);
}
