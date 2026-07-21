/** Datums- und Countdown-Texte für den Mast (Ton: werkstatt-knapp,
Master-Prototyp: „Fr 24. – So 26. Juli · noch 4 Tage"). */

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const MONTH_FORMAT = new Intl.DateTimeFormat('de-AT', { month: 'long' });

function atMidnight(value: string | Date): Date {
	const d = new Date(value);
	d.setHours(0, 0, 0, 0);
	return d;
}

function formatDay(d: Date, withMonth: boolean): string {
	const base = `${WEEKDAYS[d.getDay()]} ${d.getDate()}.`;
	return withMonth ? `${base} ${MONTH_FORMAT.format(d)}` : base;
}

/** „Fr 24. – So 26. Juli" — Monat am Start nur, wenn er sich vom Ende unterscheidet. */
export function formatFestDateRange(startDate: string, endDate?: string | null): string {
	const start = atMidnight(startDate);
	const end = endDate ? atMidnight(endDate) : null;
	if (!end || end.getTime() === start.getTime()) {
		return formatDay(start, true);
	}
	const sameMonth =
		start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
	return `${formatDay(start, !sameMonth)} – ${formatDay(end, true)}`;
}

/** „noch 4 Tage" / „morgen!" / „heute!" / „läuft gerade" / „vorbei" */
export function festCountdown(
	startDate: string,
	endDate?: string | null,
	today: Date = new Date()
): string {
	const now = atMidnight(today);
	const start = atMidnight(startDate);
	const end = endDate ? atMidnight(endDate) : start;
	const days = Math.round((start.getTime() - now.getTime()) / 86400000);
	if (days > 1) return `noch ${days} Tage`;
	if (days === 1) return 'morgen!';
	if (days === 0) return 'heute!';
	if (now.getTime() <= end.getTime()) return 'läuft gerade';
	return 'vorbei';
}
