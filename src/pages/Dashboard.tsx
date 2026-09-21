import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/components/AuthProvider';
import FestivalListMast from '@/components/festival-list/FestivalListMast';
import FestivalWall from '@/components/festival-list/FestivalWall';
import { arrangeFestivalWall, festivalTitle } from '@/components/festival-list/festivalList';
import FestivalEditDialog from '@/components/festival/FestivalEditDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import type { FestivalMetricsMap } from '@/lib/festivalMetrics';
import { getFestivalMetrics } from '@/lib/festivalMetricsService';
import { festivalWorkspacePath, newFestivalPath } from '@/lib/festivalRoutes';
import {
	deleteFestival,
	getUserFestivals,
	updateFestival,
	type Festival,
	type FestivalEdits
} from '@/lib/festivalService';

/**
 * Fest-Einstieg („Meine Feste", Issue #90): Mast + Plakatwand mit drei Rängen.
 * „+ NEUES FEST" und „ALS VORLAGE" führen auf die Kopierwerk-Route (#93) —
 * letzteres mit der Vorlage im Link, damit der Sprung deep-linkbar ist.
 */
export default function Dashboard() {
	const [festivals, setFestivals] = useState<Festival[]>([]);
	const [metrics, setMetrics] = useState<FestivalMetricsMap>({});
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState<Festival | null>(null);

	const { user, signOut } = useAuth();
	const navigate = useNavigate();
	const isMobile = useIsMobile();
	const { toast } = useToast();
	const today = useMemo(() => new Date(), []);

	const reportError = useCallback(
		(error: unknown, title = 'Fehler') => {
			toast({
				title,
				description:
					error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten',
				variant: 'destructive'
			});
		},
		[toast]
	);

	const loadFestivals = useCallback(async () => {
		try {
			setFestivals(await getUserFestivals());
		} catch (error: unknown) {
			reportError(error);
		} finally {
			setLoading(false);
		}
	}, [reportError]);

	useEffect(() => {
		loadFestivals();
	}, [loadFestivals]);

	// Die Kennzahlen hängen der Wand nach: sie rendert sofort mit den Fest-Zeilen,
	// die Kennzahl-Zeile kommt, sobald die drei gebündelten Abfragen da sind.
	// Scheitern sie, bleibt es bei den Plakaten ohne Zeile — für eine Randnotiz
	// die Seite mit einem Fehler zu behängen wäre unverhältnismäßig (Spec #92).
	useEffect(() => {
		const ids = festivals.map((f) => f.id);
		if (ids.length === 0) {
			setMetrics({});
			return;
		}
		let current = true;
		getFestivalMetrics(ids)
			.then((loaded) => {
				if (current) setMetrics(loaded);
			})
			.catch((error: unknown) => {
				console.warn('[Plakat-Kennzahlen] nicht geladen:', error);
				if (current) setMetrics({});
			});
		return () => {
			current = false;
		};
	}, [festivals]);

	const openKopierwerk = (templateId?: string) => navigate(newFestivalPath(templateId));

	const handleSignOut = async () => {
		await signOut();
		navigate('/auth');
	};

	const handleSave = async (edits: FestivalEdits) => {
		if (!editing) return;
		try {
			await updateFestival(editing.id, edits);
			await loadFestivals();
			toast({ title: 'Fest aktualisiert' });
		} catch (error: unknown) {
			reportError(error, 'Fehler beim Speichern');
		}
	};

	const handleDelete = async (festival: Festival) => {
		try {
			await deleteFestival(festival.id);
			toast({
				title: 'Fest gelöscht',
				description: `${festivalTitle(festival)} wurde erfolgreich gelöscht.`
			});
			await loadFestivals();
		} catch (error: unknown) {
			reportError(error);
		}
	};

	if (!user) {
		return null;
	}

	// Ein Bezugstag für Ränge, Zählzeile und Countdown-Stempel — sonst rechnen
	// Mast und Wand über Mitternacht hinweg mit verschiedenen Tagen.
	const ranks = arrangeFestivalWall(festivals, today);

	return (
		<div className="min-h-screen">
			{/* Layout-Rahmen der Vision: max-width 1180px, zentriert */}
			<div
				className={
					isMobile
						? 'mx-auto max-w-[1180px] px-3 pb-16 pt-3'
						: 'mx-auto max-w-[1180px] px-[22px] pb-20 pt-[18px]'
				}>
				<FestivalListMast
					festivalCount={festivals.length}
					upcomingCount={ranks.upcomingCount}
					compact={isMobile}
					onNewFestival={() => openKopierwerk()}
					onSponsors={() => navigate('/sponsors')}
					onSignOut={handleSignOut}
				/>

				<div className="pt-5">
					{loading ? (
						<div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-[repeat(3,minmax(0,1fr))]">
							{[1, 2, 3].map((i) => (
								<div key={i} className="h-40 border-2.5 border-dashed border-linie" />
							))}
						</div>
					) : (
						<FestivalWall
							ranks={ranks}
							today={today}
							metrics={metrics}
							onOpen={(festival) => navigate(festivalWorkspacePath(festival.id))}
							onUseAsTemplate={(festival) => openKopierwerk(festival.id)}
							onEdit={setEditing}
							onDelete={handleDelete}
							onNewFestival={() => openKopierwerk()}
						/>
					)}
				</div>
			</div>

			{editing && (
				<FestivalEditDialog
					open
					onOpenChange={(open) => {
						if (!open) setEditing(null);
					}}
					festival={{
						id: editing.id,
						// Kein Ersatzname: ein namenloses Fest soll das Feld leer zeigen,
						// nicht das Wort „Fest" zum echten Namen machen.
						name: editing.name ?? '',
						start_date: editing.start_date,
						end_date: editing.end_date,
						location: editing.location
					}}
					onSave={handleSave}
				/>
			)}
		</div>
	);
}
