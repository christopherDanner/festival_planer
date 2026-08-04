import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/components/AuthProvider';
import FestivalWizard from '@/components/FestivalWizard';
import FestListMast from '@/components/festival-list/FestListMast';
import FestivalWall from '@/components/festival-list/FestivalWall';
import { arrangeFestivalWall, festivalTitle } from '@/components/festival-list/festivalRanks';
import FestivalEditDialog from '@/components/festival/FestivalEditDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import {
	deleteFestival,
	getUserFestivals,
	updateFestival,
	type Festival
} from '@/lib/festivalService';

/**
 * Fest-Einstieg („Meine Feste", Issue #90): Mast + Plakatwand mit drei Rängen.
 * Bis das Kopierwerk seine eigene Route hat (#93), führen „+ NEUES FEST" und
 * „ALS VORLAGE" weiter in den heutigen Wizard — letzteres mit vorbelegter Vorlage.
 */
export default function Dashboard() {
	const [festivals, setFestivals] = useState<Festival[]>([]);
	const [loading, setLoading] = useState(true);
	const [wizardTemplateId, setWizardTemplateId] = useState<string | undefined>();
	const [showWizard, setShowWizard] = useState(false);
	const [editing, setEditing] = useState<Festival | null>(null);

	const { user, signOut } = useAuth();
	const navigate = useNavigate();
	const isMobile = useIsMobile();
	const { toast } = useToast();

	const reportError = useCallback(
		(title: string, error: unknown) => {
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
			reportError('Fehler', error);
		} finally {
			setLoading(false);
		}
	}, [reportError]);

	useEffect(() => {
		loadFestivals();
	}, [loadFestivals]);

	const openWizard = (templateId?: string) => {
		setWizardTemplateId(templateId);
		setShowWizard(true);
	};

	const closeWizard = () => {
		setShowWizard(false);
		setWizardTemplateId(undefined);
	};

	const handleSignOut = async () => {
		await signOut();
		navigate('/auth');
	};

	const handleSave = async (updates: {
		name: string;
		start_date: string;
		end_date: string | null;
		location: string | null;
	}) => {
		if (!editing) return;
		try {
			await updateFestival(editing.id, {
				name: updates.name,
				start_date: updates.start_date,
				end_date: updates.end_date ?? undefined,
				location: updates.location ?? undefined
			});
			await loadFestivals();
			toast({ title: 'Fest aktualisiert' });
		} catch (error: unknown) {
			reportError('Fehler beim Speichern', error);
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
			reportError('Fehler', error);
		}
	};

	if (showWizard) {
		return (
			<FestivalWizard
				initialTemplateId={wizardTemplateId}
				onClose={closeWizard}
				onComplete={() => {
					closeWizard();
					loadFestivals();
				}}
			/>
		);
	}

	if (!user) {
		return null;
	}

	const { upcomingCount } = arrangeFestivalWall(festivals);

	return (
		<div className="min-h-screen">
			{/* Layout-Rahmen der Vision: max-width 1180px, zentriert */}
			<div
				className={
					isMobile
						? 'mx-auto max-w-[1180px] px-3 pb-16 pt-3'
						: 'mx-auto max-w-[1180px] px-[22px] pb-20 pt-[18px]'
				}>
				<FestListMast
					festivalCount={festivals.length}
					upcomingCount={upcomingCount}
					compact={isMobile}
					onNewFestival={() => openWizard()}
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
							festivals={festivals}
							onOpen={(festival) => navigate(`/festival-results?id=${festival.id}`)}
							onUseAsTemplate={(festival) => openWizard(festival.id)}
							onEdit={setEditing}
							onDelete={handleDelete}
							onNewFestival={() => openWizard()}
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
						name: festivalTitle(editing),
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
