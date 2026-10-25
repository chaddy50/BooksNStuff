import { Fragment } from "react";

interface InstanceMetaLineProps {
	labels: string[];
}

/** Renders meta labels (date/status, consumption method, progress) separated by middots. */
export function InstanceMetaLine({ labels }: InstanceMetaLineProps) {
	return (
		<div className="text-sm">
			{labels.map((label, index) => (
				<Fragment key={label}>
					{index > 0 && (
						<span className="mx-1.5" aria-hidden="true">
							·
						</span>
					)}
					<span>{label}</span>
				</Fragment>
			))}
		</div>
	);
}
