import * as React from 'react';

import FestivalTabBar, { type FestivalTab } from '@/components/festival/FestivalTabBar';
import FestivalTabRail from '@/components/festival/FestivalTabRail';
import { Mast } from '@/components/toolkit/Mast';
import { ModeToggle } from '@/components/toolkit/ModeToggle';
import { NameChip } from '@/components/toolkit/NameChip';
import { OpenSlot } from '@/components/toolkit/OpenSlot';
import { Ruler } from '@/components/toolkit/Ruler';
import { SectionHeading } from '@/components/toolkit/SectionHeading';
import { SegmentedControl } from '@/components/toolkit/SegmentedControl';
import { Stamp } from '@/components/toolkit/Stamp';
import { StatusBar } from '@/components/toolkit/StatusBar';
import { ValueTag } from '@/components/toolkit/ValueTag';

function Abschnitt({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="mb-10">
			<SectionHeading className="mb-3">{title}</SectionHeading>
			{children}
		</section>
	);
}

function Probe({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="border-2 border-tinte bg-white p-4">
			<p className="mb-3 text-[10.5px] font-bold uppercase tracking-[.05em] text-tinte-soft">{label}</p>
			{children}
		</div>
	);
}

interface SchalterProbeProps {
	ariaLabel: string;
	options: { value: string; label: string }[];
}

function SegmentedProbe({ ariaLabel, options }: SchalterProbeProps) {
	const [value, setValue] = React.useState(options[0].value);
	return <SegmentedControl aria-label={ariaLabel} options={options} value={value} onValueChange={setValue} />;
}

function ModeToggleProbe({ ariaLabel, options }: SchalterProbeProps) {
	const [value, setValue] = React.useState(options[0].value);
	return <ModeToggle aria-label={ariaLabel} options={options} value={value} onValueChange={setValue} />;
}

/** App-Shell-Probe (Issue #76): Mast + Tab-Leiste + Bottom-Bar mit Beispieldaten
des Master-Prototyps — Vergleichsfläche für die Headless-Screenshots. */
function AppShellProbe() {
	const [tab, setTab] = React.useState<FestivalTab>('overview');
	const [bottomBar, setBottomBar] = React.useState(false);
	return (
		<div className="grid gap-4">
			<Probe label="Mast + angedockte Tab-Leiste (≥900px) · Tabs interaktiv">
				<Mast
					title="Musikfest Steinbach 2026"
					when={
						<>
							Fr 24. – So 26. Juli · <b className="font-semibold text-gelb">noch 4 Tage</b>
						</>
					}
					onWordmarkClick={() => {}}
				/>
				<FestivalTabRail active={tab} onSelect={setTab} />
			</Probe>
			<Probe label="Kompakt-Mast (<900px, mitscrollend)">
				<Mast
					compact
					title="Musikfest Steinbach 2026"
					when={
						<>
							Fr 24. – So 26. Juli · <b className="font-semibold text-gelb">noch 4 Tage</b>
						</>
					}
					onWordmarkClick={() => {}}
				/>
			</Probe>
			<Probe label="Bottom-Tab-Bar (<900px, fixed) · einblendbar">
				<label className="flex items-center gap-2 text-sm font-semibold">
					<input
						type="checkbox"
						checked={bottomBar}
						onChange={(e) => setBottomBar(e.target.checked)}
					/>
					Bottom-Bar am Viewport-Rand einblenden
				</label>
				{bottomBar && <FestivalTabBar active={tab} onSelect={setTab} />}
			</Probe>
		</div>
	);
}

/** Dev-only Schaukasten: lebendes Inventar der Toolkit-Bausteine,
Vergleichsfläche gegen design-vision/design-vision-prototyp.html (Issue #74). */
const Werkstatt = () => (
	<div className="mx-auto max-w-[1180px] px-4 py-8">
		<header className="mb-8 border-2.5 border-tinte bg-gruen p-5 text-white">
			<h1 className="font-display text-2xl font-semibold uppercase tracking-[.02em]">Werkstatt — Toolkit-Schaukasten</h1>
			<p className="mt-1 text-sm text-white/85">
				Nur im Dev-Build. Referenz: design-vision/design-vision-prototyp.html + DESIGN-VISION.md §4.
			</p>
		</header>

		<Abschnitt title="App-Shell — Mast, Tab-Leiste, Bottom-Bar">
			<AppShellProbe />
		</Abschnitt>

		<Abschnitt title="Ruler — Maßband">
			<div className="grid gap-4 md:grid-cols-2">
				<Probe label="Groß (18px) · 41/52 besetzt">
					<Ruler value={41} max={52} />
				</Probe>
				<Probe label="Groß · Grenzfälle 0/52 und 52/52">
					<Ruler value={0} max={52} className="mb-3" />
					<Ruler value={52} max={52} />
				</Probe>
				<Probe label="Klein (11px, für Karten) · 79 %">
					<Ruler value={41} max={52} size="small" />
				</Probe>
				<Probe label="Klein · 63 %">
					<Ruler value={15} max={24} size="small" />
				</Probe>
				<Probe label="Marke an eigener Position · Sponsoring gegen Vorjahr">
					<Ruler
						value={4850}
						max={4850}
						mark={4400}
						markLabel="Vorjahr"
						valueText="€ 4.850, Vorjahr € 4.400"
						className="mt-4"
					/>
				</Probe>
			</div>
		</Abschnitt>

		<Abschnitt title="Stamp — Stempel">
			<div className="grid gap-4 md:grid-cols-2">
				<Probe label="Groß rotiert (lg, tilt left) · Rot">
					<Stamp tone="red" size="lg">
						Voll besetzt
					</Stamp>
				</Probe>
				<Probe label="Erledigt (md, tilt right) · Grün">
					<Stamp tone="green" size="md" tilt="right">
						Erledigt
					</Stamp>
				</Probe>
				<Probe label="Status-Stempel (sm, ohne Rotation)">
					<div className="flex flex-wrap items-center gap-3">
						<Stamp tone="green" size="sm" tilt="none">
							✓ Gespeichert
						</Stamp>
						<Stamp tone="green" size="sm" tilt="none" filled>
							Wird neu angelegt
						</Stamp>
					</div>
				</Probe>
				<Probe label="Tinte-Ton">
					<Stamp tone="ink" size="md">
						Entwurf
					</Stamp>
				</Probe>
			</div>
		</Abschnitt>

		<Abschnitt title="StatusBar — Ampel-Logik (leer = Rot, teilbesetzt = Gelb, voll = Grün)">
			<div className="grid gap-4 md:grid-cols-3">
				<Probe label="Balkenfüllung (bar)">
					<div className="grid gap-3">
						<StatusBar assigned={0} required={6} />
						<StatusBar assigned={3} required={6} />
						<StatusBar assigned={6} required={6} />
					</div>
				</Probe>
				<Probe label="Badge">
					<div className="flex flex-wrap gap-3">
						<StatusBar variant="badge" assigned={0} required={6} />
						<StatusBar variant="badge" assigned={3} required={6} />
						<StatusBar variant="badge" assigned={6} required={6} />
					</div>
				</Probe>
				<Probe label="4px-Linkskante (edge) an einer Karte">
					<div className="grid gap-3">
						{[
							{ assigned: 0, required: 4, name: 'Ausschank Sa-Abend' },
							{ assigned: 2, required: 4, name: 'Kassa Sa-Mittag' },
							{ assigned: 4, required: 4, name: 'Grill So-Früh' },
						].map((s) => (
							<div key={s.name} className="relative border-1.5 border-tinte py-2 pl-4 pr-3 text-sm font-semibold">
								<StatusBar variant="edge" assigned={s.assigned} required={s.required} />
								{s.name} · {s.assigned}/{s.required}
							</div>
						))}
					</div>
				</Probe>
			</div>
		</Abschnitt>

		<Abschnitt title="OpenSlot — Freier Platz">
			<Probe label="Klickbare freie Plätze">
				<div className="flex flex-wrap gap-3">
					<OpenSlot>+1 offen</OpenSlot>
					<OpenSlot>Hier eintragen</OpenSlot>
				</div>
			</Probe>
		</Abschnitt>

		<Abschnitt title="NameChip — Namens-Marke">
			<div className="grid gap-4 md:grid-cols-2">
				<Probe label="Ohne Entfernen-Aktion">
					<div className="flex flex-wrap gap-2">
						<NameChip>Maria Huber</NameChip>
						<NameChip>Sepp Gruber</NameChip>
					</div>
				</Probe>
				<Probe label="Mit ×-Entfernen-Aktion">
					<div className="flex flex-wrap gap-2">
						<NameChip onRemove={() => {}} removeLabel="Maria Huber entfernen">
							Maria Huber
						</NameChip>
						<NameChip onRemove={() => {}} removeLabel="Sepp Gruber entfernen">
							Sepp Gruber
						</NameChip>
					</div>
				</Probe>
			</div>
		</Abschnitt>

		<Abschnitt title="ValueTag — Wertmarke">
			<div className="grid gap-4 md:grid-cols-3">
				<Probe label="Standard (Kategoriename + Wert)">
					<div className="flex flex-wrap gap-2">
						<ValueTag value="€ 200">Werbeplakat</ValueTag>
						<ValueTag value="€ 300">Transparent Bühne</ValueTag>
					</div>
				</Probe>
				<Probe label="Überschriebener Wert (rot)">
					<ValueTag value="€ 350" overridden>
						Werbeplakat
					</ValueTag>
				</Probe>
				<Probe label="Gestrichelt grau: ohne Kategorie / Sachleistung">
					<div className="flex flex-wrap gap-2">
						<ValueTag tone="muted">ohne Kategorie</ValueTag>
						<ValueTag tone="muted" value="€ 150">
							Sachleistung
						</ValueTag>
					</div>
				</Probe>
				<Probe label="Tinte-Marke: Betrag ohne Standardwert (Freibetrag)">
					<ValueTag tone="ink" value="€ 200" />
				</Probe>
			</div>
		</Abschnitt>

		<Abschnitt title="SegmentedControl — Segment-Schalter (gelber Aktiv-Zustand)">
			<div className="grid gap-4 md:grid-cols-2">
				<Probe label="Mengenquelle · interaktiv (Pfeiltasten/Tab)">
					<SegmentedProbe
						ariaLabel="Mengenquelle"
						options={[
							{ value: 'bestellt', label: 'Bestellmenge' },
							{ value: 'tatsaechlich', label: 'Tatsächliche Menge' },
						]}
					/>
				</Probe>
				<Probe label="Drei Segmente · interaktiv">
					<SegmentedProbe
						ariaLabel="Tag wählen"
						options={[
							{ value: 'fr', label: 'Freitag' },
							{ value: 'sa', label: 'Samstag' },
							{ value: 'so', label: 'Sonntag' },
						]}
					/>
				</Probe>
			</div>
		</Abschnitt>

		<Abschnitt title="ModeToggle — Modus-Umschalter (invertiert)">
			<Probe label="ARBEITSLISTE ⇄ ÜBERNAHME · interaktiv (Pfeiltasten/Tab)">
				<ModeToggleProbe
					ariaLabel="Material-Modus"
					options={[
						{ value: 'arbeitsliste', label: 'ARBEITSLISTE' },
						{ value: 'uebernahme', label: 'ÜBERNAHME' },
					]}
				/>
			</Probe>
		</Abschnitt>
	</div>
);

export default Werkstatt;
