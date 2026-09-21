/**
 * Was jsdom fehlt, damit Radix-Komponenten im Test laufen.
 *
 * Die schwebenden Bausteine (Popover, DropdownMenu, Select) messen ihre
 * Platzierung über einen `ResizeObserver`; jsdom kennt ihn nicht. Der Stummel
 * misst nichts — im Test interessiert das Verhalten, nicht die Position.
 */
if (!('ResizeObserver' in globalThis)) {
	(globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
}
