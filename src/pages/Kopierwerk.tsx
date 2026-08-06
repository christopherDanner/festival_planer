import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import FestivalBasicsStep from '@/components/kopierwerk/FestivalBasicsStep';
import KopierwerkMast from '@/components/kopierwerk/KopierwerkMast';
import StampCard from '@/components/kopierwerk/StampCard';
import TemplateSelectionStep from '@/components/kopierwerk/TemplateSelectionStep';
import { loadTemplate, type LoadedTemplate } from '@/components/kopierwerk/loadTemplate';
import {
	draftToFestivalData,
	emptyFestivalDraft,
	isDraftReady,
	kopierwerkSteps,
	stampCardHeading,
	type FestivalDraft,
	type KopierwerkStepKey
} from '@/components/kopierwerk/kopierwerk';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { copyFestivalData, type CopyFestivalOptions } from '@/lib/festivalCopyService';
import { FESTIVAL_LIST_PATH, festivalWorkspacePath, templateIdFromSearch } from '@/lib/festivalRoutes';
import { createFestival, getUserFestivals, type Festival } from '@/lib/festivalService';

type CopySelection = Omit<
	CopyFestivalOptions,
	'sourceFestivalStartDate' | 'targetFestivalStartDate'
>;

/**
 * Kopierwerk (`/festivals/neu`, Issue #93): eigene Route statt In-Page-Zustand
 * der Festliste — damit ist der Einstieg deep-linkbar (`?vorlage=<id>`) und
 * Browser-Zurück führt auf die Wand.
 *
 * Links (bzw. unter 900px oben) die Stempelkarte, rechts die Werkbank des
 * aktuellen Schritts. Schritt 2 und 3 in eigener Handschrift sind #94/#95;
 * bis dahin hängt die bestehende Vorlagen-Auswahl an Schritt 2, damit das
 * Kopieren durchgehend funktionsfähig bleibt.
 */
export default function Kopierwerk() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const isMobile = useIsMobile();
	const { toast } = useToast();

	// Die Vorlage aus dem Link belegt den Entwurf einmal vor; danach führt das
	// Feld in Schritt 1. Sie in die Adresse zurückzuschreiben würde jeden
	// Vorlagen-Wechsel in die Verlaufs-Historie legen — Browser-Zurück soll auf
	// die Wand führen, nicht durch verworfene Vorlagen.
	const [draft, setDraft] = useState<FestivalDraft>(() =>
		emptyFestivalDraft(templateIdFromSearch(searchParams))
	);
	const [step, setStep] = useState<KopierwerkStepKey>('basics');
	const [templates, setTemplates] = useState<Festival[]>([]);
	const [template, setTemplate] = useState<LoadedTemplate | null>(null);
	const [loadingTemplate, setLoadingTemplate] = useState(false);
	const [saving, setSaving] = useState(false);

	const { templateId } = draft;

	useEffect(() => {
		// Scheitert die Liste, bleibt nur das Vorlage-Feld leer — die Vorlage aus
		// dem Deep-Link lädt darunter trotzdem, sie hängt nicht an dieser Abfrage.
		getUserFestivals()
			.then(setTemplates)
			.catch((error: unknown) => console.warn('[Kopierwerk] Vorlagen nicht geladen:', error));
	}, []);

	useEffect(() => {
		if (!templateId) {
			setTemplate(null);
			return;
		}
		let current = true;
		setLoadingTemplate(true);
		loadTemplate(templateId)
			.then((loaded) => {
				if (current) setTemplate(loaded);
			})
			// Auch ein gelöschtes oder erfundenes Fest im Link landet hier: lieber ohne
			// Vorlage weitermachen, als einen Kopier-Schritt anbieten, der ins Leere greift.
			.catch(() => {
				if (!current) return;
				toast({ title: 'Vorlage konnte nicht geladen werden', variant: 'destructive' });
				setTemplate(null);
				setDraft((previous) => ({ ...previous, templateId: '' }));
				setStep('basics');
			})
			.finally(() => {
				if (current) setLoadingTemplate(false);
			});
		return () => {
			current = false;
		};
	}, [templateId, toast]);

	const steps = kopierwerkSteps({
		current: step,
		hasTemplate: templateId !== '',
		scope: template
			? {
					stations: template.stations.length,
					shifts: template.shifts.length,
					materials: template.materials.length
				}
			: undefined,
		festivalName: draft.name.trim() || undefined
	});
	const templateName = template?.festival.name;
	const heading = useMemo(() => stampCardHeading(draft, templateName), [draft, templateName]);

	const backToWall = () => navigate(FESTIVAL_LIST_PATH);

	const changeDraft = (patch: Partial<FestivalDraft>) => {
		// Ein Vorlagen-Wechsel wirft die Schritte danach weg — deren Auswahl gehörte
		// zur alten Vorlage.
		if (patch.templateId !== undefined) setStep('basics');
		setDraft((previous) => ({ ...previous, ...patch }));
	};

	const createNewFestival = useCallback(
		async (selection?: CopySelection) => {
			if (!isDraftReady(draft)) return;
			setSaving(true);
			try {
				const festivalId = await createFestival(draftToFestivalData(draft));

				// `template` und nicht `selection` entscheidet: die Auswahl kommt aus
				// Schritt 2, den es ohne geladene Vorlage gar nicht gibt — so kann kein
				// Fest still ohne Kopie entstehen, während der Hinweis eine verspricht.
				if (selection && template) {
					await copyFestivalData(template.festival.id, festivalId, {
						...selection,
						sourceFestivalStartDate: template.festival.start_date,
						targetFestivalStartDate: draft.startDate
					});
				}

				toast({
					title: 'Fest angelegt',
					description: selection
						? 'Das Fest wurde aus der Vorlage angelegt.'
						: 'Stationen, Material und Ablauf legst du jetzt am Fest an.'
				});
				navigate(festivalWorkspacePath(festivalId));
			} catch (error: unknown) {
				toast({
					title: 'Fest konnte nicht angelegt werden',
					description:
						error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten',
					variant: 'destructive'
				});
			} finally {
				setSaving(false);
			}
		},
		[draft, navigate, template, toast]
	);

	const submitBasics = () => {
		if (templateId) {
			if (template) setStep('stations');
			return;
		}
		void createNewFestival();
	};

	const workbench =
		step === 'basics' || !template ? (
			<FestivalBasicsStep
				draft={draft}
				templates={templates}
				loadingTemplate={loadingTemplate}
				saving={saving}
				onChange={changeDraft}
				onSubmit={submitBasics}
			/>
		) : (
			<TemplateSelectionStep
				stations={template.stations}
				shifts={template.shifts}
				materials={template.materials}
				loading={saving}
				onBack={() => setStep('basics')}
				onSubmit={(selection) => void createNewFestival(selection)}
			/>
		);

	return (
		<div className="min-h-screen">
			{/* Layout-Rahmen der Vision: max-width 1180px, zentriert */}
			<div
				className={
					isMobile
						? 'mx-auto max-w-[1180px] px-3 pb-16 pt-3'
						: 'mx-auto max-w-[1180px] px-[22px] pb-20 pt-[18px]'
				}>
				<KopierwerkMast
					templateName={templateName}
					compact={isMobile}
					onOpenFestivalList={backToWall}
					onCancel={backToWall}
				/>

				{isMobile ? (
					<>
						<StampCard steps={steps} heading={heading} compact />
						<div className="pt-4">{workbench}</div>
					</>
				) : (
					<div className="grid grid-cols-[250px_minmax(0,1fr)] items-start gap-[22px] pt-6">
						<StampCard steps={steps} heading={heading} compact={false} />
						<div className="min-w-0">{workbench}</div>
					</div>
				)}
			</div>
		</div>
	);
}
