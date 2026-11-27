import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Der **Rot-Puls**: 0,5 s `inset`-Schatten über einer abgelehnten Fläche
 * (DESIGN-VISION.md §4 „Ablehnung = 0.5s Rot-Puls"). Er sagt am Ort, dass eine
 * Geste nicht durchgeht — statt eines Toasts oben rechts, der den Grund von
 * seinem Ort trennt.
 *
 * Er liegt als **eigene Lage** über der Fläche und nicht als Klasse an ihr: Wird
 * zweimal hintereinander dasselbe abgelehnt, muss die Animation neu anspringen,
 * und dazu muss das Element neu entstehen — der Aufrufer gibt ihm dafür einen
 * wechselnden `key`. Die Fläche selbst darf nicht neu entstehen, sie trägt in
 * der Regel das, worauf der Tastaturfokus steht.
 *
 * Stumm für Screenreader: eine Lage, die nach einer halben Sekunde wieder
 * verschwindet, ist keine verlässliche Live-Region. Den Grund sagt der Aufrufer
 * in einem Bereich an, der stehen bleibt.
 *
 * Die umgebende Fläche muss `relative` sein.
 */
export function RejectPulse({ className }: { className?: string }) {
	return (
		<span
			aria-hidden
			className={cn('pointer-events-none absolute inset-0 animate-puls-rot', className)}
		/>
	);
}
