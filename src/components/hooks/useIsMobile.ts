import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT_QUERY = "(max-width: 767px)";

export function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState(false);

	useEffect(() => {
		const mobileQuery = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
		setIsMobile(mobileQuery.matches);

		function handleChange() {
			setIsMobile(mobileQuery.matches);
		}
		mobileQuery.addEventListener("change", handleChange);
		return () => mobileQuery.removeEventListener("change", handleChange);
	}, []);

	return isMobile;
}
