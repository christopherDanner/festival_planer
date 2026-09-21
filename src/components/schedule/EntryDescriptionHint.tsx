import { Info } from 'lucide-react';

/**
 * Die Beschreibung eines Ablauf-Eintrags als Hinweis-Zeichen. Der Tooltip hängt
 * am umschließenden `span`, weil das SVG von lucide kein `title` annimmt.
 * Zeile und Karte zeigen denselben Hinweis — darum steht er hier einmal.
 */
const EntryDescriptionHint = ({ description }: { description: string | null }) => {
	if (!description) return null;

	return (
		<span title={description} className="inline-flex">
			<Info className="h-3.5 w-3.5 text-muted-foreground/60" />
		</span>
	);
};

export default EntryDescriptionHint;
