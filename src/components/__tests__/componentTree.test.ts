import { describe, it, expect } from 'vitest';

import { analyzeComponentTree } from './componentTree';

/**
 * Bestandsprüfung unter `src/components/` (#163).
 *
 * Entschieden in #101: Die App hat genau ein Kopf-Muster, den Mast. Solche
 * Entscheidungen halten nur, wenn das abgelöste Bauteil auch von der Platte
 * verschwindet — eine liegengebliebene Datei sieht aus wie eine Alternative
 * und wird wieder importiert. Dasselbe gilt für `ui/`: ADR 0003 hat die
 * ungenutzten shadcn-Dateien gelöscht (#72), und was danach seinen letzten
 * Nutzer verliert, gehört genauso hinterher.
 */
describe('Bestand unter src/components/', () => {
	const tree = analyzeComponentTree();

	it('liest den Bestand wirklich ein', () => {
		// Ohne diese Probe wäre der Guard darunter auch dann grün, wenn der
		// Scanner an einem falschen Pfad ins Leere liest.
		expect(tree.modules.length).toBeGreaterThan(100);
		expect(tree.modules).toContain('components/toolkit/Mast.tsx');
		expect(tree.modules).toContain('components/ui/button.tsx');
	});

	it('führt von der App zu jedem Bauteil einen Weg', () => {
		expect(tree.unreachable).toEqual([]);
	});
});
