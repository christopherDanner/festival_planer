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

export function formatRequiredPackaging(
	stored: number | null,
	material: QuantityContext & { packaging_unit?: string | null | undefined }
): string | null {
	if (stored == null) return null;
	if (!material.packaging_unit || !material.amount_per_packaging) return null;
	const ceiled = Math.ceil(stored);
	return `${ceiled} ${material.packaging_unit}`;
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
