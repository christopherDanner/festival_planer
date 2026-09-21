interface QuantityContext {
	packaging_unit: string | null | undefined;
	amount_per_packaging: number | null | undefined;
}

export function toBaseQuantity(
	stored: number | null,
	material: QuantityContext
): number | null {
	if (stored == null) return null;
	if (material.packaging_unit && material.amount_per_packaging) {
		return stored * material.amount_per_packaging;
	}
	return stored;
}

export function fromBaseQuantity(input: number, material: QuantityContext): number {
	if (material.packaging_unit && material.amount_per_packaging) {
		return input / material.amount_per_packaging;
	}
	return input;
}

export function ceilToPackaging(
	stored: number | null,
	material: QuantityContext
): number | null {
	if (stored == null) return null;
	if (!material.packaging_unit || !material.amount_per_packaging) return stored;
	return Math.ceil(stored);
}

/**
 * Die Gebinde-Umrechnung einer Menge: „4 × Fass". Sie steht in der
 * Positionstabelle unter der Menge (#114) und in der Übernahme-Maske — ein
 * Wortlaut für beide, sonst liest dieselbe Zahl an zwei Stellen verschieden.
 * Aufgerundet wird über `ceilToPackaging`: ein angebrochenes Fass wird trotzdem
 * geliefert.
 */
export function formatRequiredPackaging(
	stored: number | null,
	material: QuantityContext & { packaging_unit?: string | null | undefined }
): string | null {
	if (!material.packaging_unit || !material.amount_per_packaging) return null;
	const packages = ceilToPackaging(stored, material);
	return packages == null ? null : `${packages} × ${material.packaging_unit}`;
}

/**
 * Eine Menge fürs Auge: auf zwei Stellen und mit Dezimalkomma. Ohne das steht
 * in der Zelle, was der Fließkomma-Rest hergibt („0.9899999999999999") und
 * daneben in der Geldspalte ein Komma.
 */
export function formatQuantity(value: number): string {
	return String(Math.round(value * 100) / 100).replace('.', ',');
}

interface FormatPackagingContext {
	unit: string;
	packaging_unit: string | null | undefined;
	amount_per_packaging: number | null | undefined;
}

export function formatPackaging(material: FormatPackagingContext): string {
	if (material.packaging_unit && material.amount_per_packaging) {
		return `${material.amount_per_packaging} ${material.unit} pro ${material.packaging_unit}`;
	}
	if (material.packaging_unit) {
		return material.packaging_unit;
	}
	return material.unit;
}
