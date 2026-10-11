import "@testing-library/jest-dom/vitest";

// jsdom ships no ResizeObserver, and useAutoResizeTextarea constructs one on mount.
// `??=` leaves any suite-local capturing stub in place.
globalThis.ResizeObserver ??= class {
	observe() {}
	unobserve() {}
	disconnect() {}
} as unknown as typeof ResizeObserver;

// jsdom ships no scrollIntoView either, and this setup file also runs for
// suites using the plain "node" environment, where Element doesn't exist.
if (typeof Element !== "undefined") {
	// `??=` leaves a suite-local spy in place.
	Element.prototype.scrollIntoView ??= () => {
		// jsdom has no layout, so there is nothing to actually scroll.
	};
}

// jsdom ships no matchMedia either. `??=` leaves a suite-local mock in place
// for tests that need to simulate a specific OS color-scheme preference.
if (typeof window !== "undefined") {
	window.matchMedia ??= ((query: string) =>
		({
			matches: false,
			media: query,
			// No-op defaults; suites that need real listener behavior override matchMedia directly.
			addEventListener: () => undefined,
			removeEventListener: () => undefined,
		}) as unknown as MediaQueryList) as typeof window.matchMedia;
}
