import { Button } from '@/components/ui/button';

import CopySwitch from './CopySwitch';
import EmptyStep from './EmptyStep';
import type { SchedulePreviewRow } from './scheduleChoice';

/** Was der eine Schalter holt — gilt in beiden Fällen, darum steht es einmal. */
const WAS_MITKOMMT = 'Tage, Phasen und Einträge — Aufgaben kommen offen herein.';

/**
 * Der zweite Satz am Schalter: was aus den Verantwortlichen wird. Er hängt an
 * „Helfer übernehmen" aus Schritt 2, weil ein Helfer dem Fest gehört (ADR 0005)
 * — ohne kopierte Liste gibt es im Zielfest keine Zeile, auf die er zeigen
 * könnte. Das Ticket verlangt den Hinweis ausdrücklich am Schalter.
 */
const responsibleHint = (copyHelpers: boolean): string =>
	copyHelpers
		? 'Die Verantwortlichen wandern auf die übernommenen Helfer mit.'
		: 'Die Verantwortlichen bleiben leer — dafür müssten in Schritt 2 die Helfer mitkommen.';

export interface ScheduleStepProps {
	rows: SchedulePreviewRow[];
	/** Der eine Schalter des Schritts — Tage, Phasen und Einträge zusammen. */
	copySchedule: boolean;
	/** Was Schritt 2 an Helfern mitnimmt — daraus der Hinweis zu den Verantwortlichen. */
	copyHelpers: boolean;
	onCopyScheduleChange: (value: boolean) => void;
	onBack: () => void;
	onNext: () => void;
}

/**
 * Werkbank von Schritt 4 des Kopierwerks (#127): ein Schalter für den ganzen
 * Ablaufplan, darunter je Ablauf-Tag alter Termin → neuer Termin.
 *
 * Gewählt wird **nichts** je Tag — der Wert liegt in der Vollständigkeit der
 * Liste, ausgemistet wird danach im Bereich. Die Zeilen klappen darum auch
 * nicht auf wie in Schritt 2: dort ist die Station wählbar und ihre Schichten
 * zeigen ihre Termine erst drinnen, hier steht der Termin schon in der Zeile.
 */
export default function ScheduleStep({
	rows,
	copySchedule,
	copyHelpers,
	onCopyScheduleChange,
	onBack,
	onNext
}: ScheduleStepProps) {
	return (
		<div className="border-2.5 border-tinte bg-white">
			<div className="flex flex-wrap items-baseline gap-3 border-b-2.5 border-tinte px-4 py-3">
				<h3 className="text-sm font-bold uppercase tracking-[.08em]">Ablaufplan</h3>
				{/* Kein Versprechen auf den Wochentag: der Versatz hält den Abstand zum
				Fest-Start (wie bei den Schichten, #94). Starten Vorlage und neues Fest
				an verschiedenen Wochentagen, rückt er mit — die Zeilen darunter nennen
				darum je Tag den neuen Wochentag. */}
				<span className="text-xs text-tinte-soft">
					Tage, Phasen und Einträge der Vorlage rücken automatisch mit — jeder Tag behält seinen
					Abstand zum Fest-Start.
				</span>
			</div>

			{rows.length === 0 ? (
				<EmptySchedule />
			) : (
				<>
					{/* Ein Schalter für den ganzen Plan, keine Einzelauswahl je Tag. Er
					steht über der Liste, weil sie seine Vorschau ist. */}
					<div className="border-b border-linie px-4 py-3">
						<CopySwitch
							id="ablaufplan-uebernehmen"
							label="Ablaufplan übernehmen"
							hint={`${WAS_MITKOMMT} ${responsibleHint(copyHelpers)}`}
							checked={copySchedule}
							onChange={onCopyScheduleChange}
						/>
					</div>

					<ul className="max-h-[420px] overflow-y-auto">
						{rows.map((row) => (
							<li
								key={row.id}
								className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-linie px-4 py-2.5 last:border-b-0">
								{/* Termine tragen die Akzentschrift (DESIGN-VISION §4). */}
								<span className="w-[118px] font-display text-[13px] font-semibold tabular-nums">
									{row.when}
								</span>
								<span className="font-display text-[13px] font-extrabold tabular-nums text-gruen">
									<span aria-hidden>→</span> {row.newWhen}
								</span>
								{row.label && <span className="text-[12.5px] font-bold">{row.label}</span>}
								<span className="ml-auto text-[11.5px] text-tinte-soft">{row.meta}</span>
							</li>
						))}
					</ul>
				</>
			)}

			<div className="flex flex-wrap justify-between gap-3 border-t-2.5 border-tinte px-4 py-3">
				<Button variant="outline" onClick={onBack} className="h-10 px-4 text-[12.5px]">
					← Material
				</Button>
				<Button onClick={onNext} className="h-10 px-4 text-[12.5px]">
					WEITER: SPONSORING →
				</Button>
			</div>
		</div>
	);
}

/** Leerzustand wie in Schritt 3: die Vorlage führt keinen Ablaufplan, also gibt
es hier nichts zu übernehmen — das Fest entsteht trotzdem. */
function EmptySchedule() {
	return (
		<EmptyStep stamp="KEIN ABLAUFPLAN">
			Die Vorlage führt keine Ablauf-Tage — hier gibt es nichts zu übernehmen. Die Festtage des
			neuen Fests entstehen beim ersten Öffnen des Ablaufplans.
		</EmptyStep>
	);
}
