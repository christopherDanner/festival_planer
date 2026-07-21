import { OpenSlot } from '@/components/toolkit/OpenSlot';
import { Ruler } from '@/components/toolkit/Ruler';
import { Stamp } from '@/components/toolkit/Stamp';
import { StatusBar } from '@/components/toolkit/StatusBar';

function Abschnitt({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="mb-10">
			<h2 className="mb-3 flex items-center gap-3 text-sm font-bold uppercase tracking-[.08em]">
				{title}
				<span
					aria-hidden
					className="h-[7px] flex-1"
					style={{
						backgroundImage: 'radial-gradient(oklch(0.75 0.02 120) 1.1px, transparent 1.3px)',
						backgroundSize: '8px 8px',
					}}
				/>
			</h2>
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
	</div>
);

export default Werkstatt;
