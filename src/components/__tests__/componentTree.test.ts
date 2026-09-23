import { describe, it, expect } from 'vitest';

import { analyzeComponentTree } from './componentTree';

const UI = 'components/ui/';

/**
 * Bauteile, die bewusst abgehängt sind — je Eintrag das Ticket, das sie
 * wieder einhängt. Ein unerreichbares Bauteil ohne Eintrag hier ist kein
 * Parkplatz, sondern Rest.
 */
const PARKED = [
	// #103 hat den Dialog abgehängt („Bewusste Lücke bis #107"): das ⋮-Menü
	// der Helferliste öffnet vorerst nur den Helfer-Dialog. #107 verschmilzt
	// beide und nimmt ihn hier wieder raus.
	'components/shift-planning/dialogs/PreferenceDialog.tsx',
	// #122 hat das Akkordeon des Ablaufplans durch Werkzeugleiste + Werkliste
	// ersetzt. Tag und Phase werden ab #124 an ihren eigenen Zwischentiteln
	// verwaltet — bis dahin hat kein Griff mehr auf diese beiden Dialoge.
	'components/schedule/dialogs/ScheduleDayDialog.tsx',
	'components/schedule/dialogs/SchedulePhaseDialog.tsx'
];

/**
 * Bestandsprüfung unter `src/components/` (#163).
 *
 * Entschieden in #101: Die App hat genau ein Kopf-Muster, den Mast. Solche
 * Entscheidungen halten nur, wenn das abgelöste Bauteil auch von der Platte
 * verschwindet — eine liegengebliebene Datei sieht aus wie eine Alternative
 * und wird wieder importiert.
 */
describe('Bestand unter src/components/', () => {
	const tree = analyzeComponentTree();

	it('liest den Bestand wirklich ein', () => {
		// Ohne diese Probe wären die Guards darunter auch dann grün, wenn der
		// Scanner an einem falschen Pfad ins Leere liest.
		expect(tree.modules.length).toBeGreaterThan(100);
		expect(tree.modules).toContain('components/toolkit/Mast.tsx');
		expect(tree.modules).toContain('components/ui/button.tsx');
	});

	/**
	 * `ui/` ist das Regal der Verhaltens-Hüllen (ADR 0003), kein Arbeitsplatz:
	 * Was dort keinen Nutzer mehr hat, ist Ballast. Das npm-Paket dahinter
	 * gehört per Hand mit raus (die Linie aus #72) — das prüft hier nichts.
	 */
	it('lässt keine Hülle in ui/ ohne Nutzer liegen', () => {
		expect(tree.unreachable.filter((module) => module.startsWith(UI))).toEqual([]);
	});

	it('hängt kein Bauteil ohne Ticket ab', () => {
		const parked = tree.unreachable.filter((module) => !module.startsWith(UI));
		expect(parked.sort()).toEqual([...PARKED].sort());
	});
});
