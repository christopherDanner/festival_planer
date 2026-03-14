import type { FestivalMaterialWithStation } from '@/lib/materialService';
import type { ImportedMaterial } from '@/lib/materialImportService';

export interface MatchedMaterial {
	extractedName: string;
	extractedQuantity: number;
	extractedUnit: string;
	matchedMaterial: FestivalMaterialWithStation | null;
	confidence: number; // 0-1
	selected: boolean;
	createNew: boolean; // true = create as new material instead of matching
	importedData: ImportedMaterial; // full imported data for creating new materials
}

/** Normalize string for comparison: lowercase, trim, remove common noise */
function normalize(s: string): string {
	return s.toLowerCase().trim()
		.replace(/[^a-zA-Z0-9äöüßÄÖÜ\s]/g, '')
		.replace(/\s+/g, ' ');
}

/** Simple word-overlap similarity score (0-1) */
function similarity(a: string, b: string): number {
	const na = normalize(a);
	const nb = normalize(b);
	if (na === nb) return 1;

	const wordsA = na.split(' ').filter(Boolean);
	const wordsB = nb.split(' ').filter(Boolean);
	if (wordsA.length === 0 || wordsB.length === 0) return 0;

	// Check if one contains the other
	if (na.includes(nb) || nb.includes(na)) return 0.9;

	// Word overlap
	const setB = new Set(wordsB);
	const overlap = wordsA.filter(w => setB.has(w)).length;
	const maxLen = Math.max(wordsA.length, wordsB.length);
	return overlap / maxLen;
}

/** Match extracted items against existing materials */
export function matchMaterials(
	extracted: ImportedMaterial[],
	existing: FestivalMaterialWithStation[]
): MatchedMaterial[] {
	return extracted.map(item => {
		let bestMatch: FestivalMaterialWithStation | null = null;
		let bestScore = 0;

		for (const mat of existing) {
			const score = similarity(item.name, mat.name);
			if (score > bestScore) {
				bestScore = score;
				bestMatch = mat;
			}
		}

		const threshold = 0.4;
		const matched = bestScore >= threshold;
		return {
			extractedName: item.name,
			extractedQuantity: item.ordered_quantity,
			extractedUnit: item.unit,
			matchedMaterial: matched ? bestMatch : null,
			confidence: matched ? bestScore : 0,
			selected: matched,
			createNew: false,
			importedData: item,
		};
	});
}
