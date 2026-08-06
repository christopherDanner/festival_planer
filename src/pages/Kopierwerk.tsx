import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import FestivalBasicsStep from '@/components/festival-wizard/FestivalBasicsStep';
import KopierwerkMast from '@/components/festival-wizard/KopierwerkMast';
import StampCard from '@/components/festival-wizard/StampCard';
import TemplateSelectionStep from '@/components/festival-wizard/TemplateSelectionStep';
import {
	draftToFestivalData,
	emptyFestivalDraft,
	isDraftReady,
	kopierwerkSteps,
	stampCardHeading,
	type FestivalDraft,
	type KopierwerkStepKey
} from '@/components/festival-wizard/kopierwerk';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { copyFestivalData, type CopyFestivalOptions } from '@/lib/festivalCopyService';
import { FESTIVAL_LIST_PATH, festivalTabPath, templateIdFromSearch } from '@/lib/festivalRoutes';
import { createFestival, getUserFestivals, type Festival } from '@/lib/festivalService';
import type { FestivalMaterialWithStation } from '@/lib/materialService';
import { getMaterials } from '@/lib/materialService';
import { getStationShifts, getStations, type Station, type StationShift } from '@/lib/shiftService';

/** Was aus der Vorlage kopiert werden kann — der Umfang, den die Karte beziffert. */
interface TemplateContent {
	stations: Station[];
	shifts: StationShift[];
	materials: FestivalMaterialWithStation[];
}

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
	const [templateContent, setTemplateContent] = useState<TemplateContent | null>(null);
	const [loadingTemplate, setLoadingTemplate] = useState(false);
	const [saving, setSaving] = useState(false);

	const { templateId } = draft;
	const selectedTemplate = templates.find((festival) => festival.id === templateId);

	useEffect(() => {
		// Scheitert die Liste, bleibt das Vorlage-Feld leer — angelegt werden kann
		// trotzdem, und der Deep-Link trägt seine Vorlage selbst.
		getUserFestivals()
			.then(setTemplates)
			.catch((error: unknown) => console.warn('[Kopierwerk] Vorlagen nicht geladen:', error));
	}, []);

	useEffect(() => {
		if (!templateId) {
			setTemplateContent(null);
			return;
		}
		let current = true;
		setLoadingTemplate(true);
		Promise.all([getStations(templateId), getStationShifts(templateId), getMaterials(templateId)])
			.then(([stations, shifts, materials]) => {
				if (current) setTemplateContent({ stations, shifts, materials });
			})
			.catch(() => {
				if (!current) return;
				toast({ title: 'Vorlage konnte nicht geladen werden', variant: 'destructive' });
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
		scope: templateContent && {
			stations: templateContent.stations.length,
			shifts: templateContent.shifts.length,
			materials: templateContent.materials.length
		},
		festivalName: draft.name.trim() || undefined
	});
	const heading = useMemo(
		() => stampCardHeading(draft, selectedTemplate?.name),
		[draft, selectedTemplate?.name]
	);

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

				if (selection && selectedTemplate) {
					await copyFestivalData(selectedTemplate.id, festivalId, {
						...selection,
						sourceFestivalStartDate: selectedTemplate.start_date,
						targetFestivalStartDate: draft.startDate
					});
				}

				toast({
					title: 'Fest angelegt',
					description: selection
						? 'Das Fest wurde aus der Vorlage angelegt.'
						: 'Stationen, Material und Ablauf hängen jetzt am neuen Fest.'
				});
				navigate(festivalTabPath(festivalId));
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
		[draft, navigate, selectedTemplate, toast]
	);

	const submitBasics = () => {
		if (templateId) {
			if (templateContent) setStep('stations');
			return;
		}
		void createNewFestival();
	};

	const workbench =
		step === 'basics' || !templateContent ? (
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
				stations={templateContent.stations}
				shifts={templateContent.shifts}
				materials={templateContent.materials}
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
					templateName={selectedTemplate?.name}
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
