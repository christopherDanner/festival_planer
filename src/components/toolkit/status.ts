/** Ampel-Logik (echte App-Regel, DESIGN-VISION.md §4):
leer = Rot, teilbesetzt = Gelb, voll = Grün. */
export type AmpelStatus = 'empty' | 'partial' | 'complete';

export function statusColor(assigned: number, required: number): AmpelStatus {
	if (required <= 0 || assigned >= required) return 'complete';
	if (assigned <= 0) return 'empty';
	return 'partial';
}
