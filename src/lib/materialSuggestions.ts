export function mergeSuggestions(defaults: string[], fromFestival: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];
	for (const value of [...defaults, ...fromFestival]) {
		const key = value.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(value);
	}
	return result;
}

export function canonicalizeValue(input: string, knownValues: string[]): string {
	const trimmed = input.trim();
	const lower = trimmed.toLowerCase();
	const match = knownValues.find((v) => v.toLowerCase() === lower);
	return match ?? trimmed;
}
