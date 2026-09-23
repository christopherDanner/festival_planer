/**
 * „3 Schichten", „1 Firma" — eine gezählte Angabe mit richtigem Numerus.
 *
 * Steht hier und nicht bei ihren Nutzern, weil jede Rückfrage, die eine Cascade
 * beziffert, sie braucht: der Schichtplan (#106) und die Preisliste (#149)
 * zählen dasselbe Muster (ADR 0003 §2).
 */
export function countLabel(count: number, singular: string, plural: string): string {
	return `${count} ${count === 1 ? singular : plural}`;
}
