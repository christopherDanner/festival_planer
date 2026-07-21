import { describe, it, expect } from 'vitest';
import { statusColor } from './status';

describe('statusColor', () => {
	it('returns empty (Rot) when nothing is assigned', () => {
		expect(statusColor(0, 5)).toBe('empty');
	});

	it('returns partial (Gelb) when some but not all slots are assigned', () => {
		expect(statusColor(1, 5)).toBe('partial');
		expect(statusColor(4, 5)).toBe('partial');
	});

	it('returns complete (Grün) when all slots are assigned', () => {
		expect(statusColor(5, 5)).toBe('complete');
	});

	it('returns complete when over-assigned', () => {
		expect(statusColor(6, 5)).toBe('complete');
	});

	it('returns complete when nothing is required', () => {
		expect(statusColor(0, 0)).toBe('complete');
	});

	it('returns empty for negative assigned counts', () => {
		expect(statusColor(-1, 5)).toBe('empty');
	});
});
