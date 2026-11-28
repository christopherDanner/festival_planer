import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { filterSponsors, type Sponsor } from '@/lib/sponsorService';

export interface FirmenwahlDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/**
	 * Die Firmen, die zur Wahl stehen — **schon ohne** die, die dieses Fest
	 * sponsern (`UNIQUE (festival_id, sponsor_id)`). Ausfiltern ist Sache des
	 * Aufrufers, der die Sponsorings des Fests kennt.
	 */
	sponsors: Sponsor[];
	/**
	 * Der globale Sponsorenbestand ist leer (erstes Fest, neue Installation).
	 * Nur so unterscheidet der Dialog „noch keine Firma" von „alle Firmen
	 * sponsern schon" — beides ergibt eine leere `sponsors`-Liste.
	 */
	bestandLeer: boolean;
	/** Eine Firma gewählt — der Aufrufer legt das leere Sponsoring an. */
	onChoose: (sponsorId: string) => void;
	/** „Neue Firma" — der Aufrufer öffnet das Firmendaten-Formular (#150). */
	onNewCompany: () => void;
	/** Während das Sponsoring entsteht, ist die Liste gesperrt. */
	saving?: boolean;
}

/**
 * „+ SPONSOR" in der Minimalform (#153, entschieden in #69): Firma wählen oder
 * neu anlegen, fertig. Das Sponsoring entsteht **leer** und wird dort gefüllt,
 * wo man es ohnehin tut — in der Matrix, per Zettel (ADR 0009). Darum gibt es
 * hier weder Kategorien noch Freibetrag noch Notiz; der frühere Dialog machte
 * all das auf einmal und doppelte damit die Matrix.
 *
 * Eine Liste mit Suche statt eines Selects: der Sponsorenbestand wächst über
 * die Jahre praktisch monoton (ADR 0010), nach fünf Festen sind es leicht 40
 * Firmen.
 */
const FirmenwahlDialog: React.FC<FirmenwahlDialogProps> = ({
	open,
	onOpenChange,
	sponsors,
	bestandLeer,
	onChoose,
	onNewCompany,
	saving = false
}) => (
	<Dialog open={open} onOpenChange={onOpenChange}>
		<DialogContent className="max-h-[90vh] max-w-lg flex flex-col">
			<DialogHeader>
				<DialogTitle>Sponsor hinzufügen</DialogTitle>
				<DialogDescription>
					Firma wählen oder neu anlegen. Das Sponsoring beginnt leer — die Beträge kommen danach
					in die Matrix.
				</DialogDescription>
			</DialogHeader>
			{/* Erst ab dem Öffnen im Baum — jedes Öffnen beginnt mit leerer Suche. */}
			<FirmenListe
				sponsors={sponsors}
				bestandLeer={bestandLeer}
				onChoose={onChoose}
				onNewCompany={onNewCompany}
				saving={saving}
			/>
		</DialogContent>
	</Dialog>
);

const FirmenListe: React.FC<
	Pick<FirmenwahlDialogProps, 'sponsors' | 'bestandLeer' | 'onChoose' | 'onNewCompany'> & {
		saving: boolean;
	}
> = ({ sponsors, bestandLeer, onChoose, onNewCompany, saving }) => {
	const [searchTerm, setSearchTerm] = useState('');
	const hits = filterSponsors(sponsors, searchTerm);

	const leer =
		sponsors.length === 0
			? bestandLeer
				? 'Noch keine Firma erfasst — neu anlegen.'
				: 'Alle Firmen sponsern dieses Fest schon.'
			: hits.length === 0
				? `Keine Firma passt zu „${searchTerm.trim()}".`
				: null;

	return (
		<div className="flex min-h-0 flex-col gap-3">
			<div className="relative">
				<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinte-soft" />
				<Input
					value={searchTerm}
					onChange={(e) => setSearchTerm(e.target.value)}
					placeholder="Firma suchen …"
					aria-label="Firma suchen"
					className="pl-9"
					autoFocus
				/>
			</div>

			{leer ? (
				<p className="border border-dashed border-linie py-6 text-center text-sm text-tinte-soft">
					{leer}
				</p>
			) : (
				<ul className="min-h-0 flex-1 overflow-y-auto border border-linie divide-y divide-linie">
					{hits.map((s) => (
						<li key={s.id}>
							<button
								type="button"
								data-firma
								disabled={saving}
								onClick={() => onChoose(s.id)}
								className="w-full min-h-[42px] px-3 py-2 text-left font-bold hover:bg-papier focus-visible:bg-papier focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tinte disabled:opacity-50">
								{s.company_name}
							</button>
						</li>
					))}
				</ul>
			)}

			{/* Die Firma fehlt in der Liste — dann mit vollen Stammdaten anlegen,
			solange man Ansprechpartner und Telefon zur Hand hat. */}
			<Button
				type="button"
				variant="outline"
				onClick={onNewCompany}
				disabled={saving}
				className="self-start">
				<Plus className="h-4 w-4 mr-2" />
				<span>Neue Firma</span>
			</Button>
		</div>
	);
};

export default FirmenwahlDialog;
