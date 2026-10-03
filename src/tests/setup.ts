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
	Element.prototype.scrollIntoView ??= () => {};
}
