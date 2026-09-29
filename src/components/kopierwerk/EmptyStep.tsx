import { Stamp } from '@/components/toolkit/Stamp';

export interface EmptyStepProps {
	/** Der rote Stempel, z. B. „KEIN MATERIAL". */
	stamp: string;
	/** Ein Satz darunter: was fehlt und wo es später entsteht. */
	children: string;
}

/**
 * Der Leerzustand einer Kopier-Werkbank: gestrichelter Rahmen, roter Stempel,
 * ein Satz. Jeder Schritt, dessen Vorlage nichts führt, sagt es so — Material
 * (#95), Ablaufplan (#127) und Sponsoring (#146) —, und jeder bleibt dabei
 * überspringbar: das Fest entsteht auch ohne den Bereich.
 *
 * Steht hier und nicht bei einer der drei Werkbänke, weil keine die Heimat der
 * anderen sein kann (ADR 0003 §2) — dieselbe Begründung wie bei den Maßen in
 * `measures.ts`.
 */
export default function EmptyStep({ stamp, children }: EmptyStepProps) {
	return (
		<div className="px-4 py-8">
			<div className="flex flex-col items-center border-2.5 border-dashed border-tinte-soft px-5 py-7 text-center">
				<Stamp tone="red" size="lg" tilt="right">
					{stamp}
				</Stamp>
				<p className="mx-auto mt-4 max-w-[46ch] text-[12.5px] leading-snug text-tinte-soft">
					{children}
				</p>
			</div>
		</div>
	);
}
