/** Kleine Griffe für Tests, die eine Komponente wirklich bedienen (jsdom). */

/**
 * Feldeingabe so setzen, dass React sie sieht. Ein einfaches `field.value = …`
 * geht an der kontrollierten Eingabe vorbei, weil React den eigenen Setter des
 * Elements überschreibt.
 */
export function typeInto(field: HTMLInputElement | HTMLTextAreaElement, text: string): void {
	// Der Setter gehört dem jeweiligen Prototyp — ein Freitextfeld ist ein
	// `textarea`, kein `input`, und React hört nur auf den eigenen.
	const prototype =
		field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
	const setValue = Object.getOwnPropertyDescriptor(prototype, 'value')!.set!;
	setValue.call(field, text);
	field.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Knopf über seine Aufschrift finden — so, wie ihn auch der Nutzer sucht. */
export function buttonByLabel(root: ParentNode, label: string): HTMLButtonElement {
	const button = [...root.querySelectorAll('button')].find((b) => b.textContent === label);
	if (!button) throw new Error(`Kein Knopf mit der Aufschrift „${label}"`);
	return button;
}
