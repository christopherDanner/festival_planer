/** Datums- und Countdown-Texte für den Mast (Ton: werkstatt-knapp,
Master-Prototyp: „Fr 24. – So 26. Juli · noch 4 Tage"). */

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const MONTH_FORMAT = new Intl.DateTimeFormat('de-AT', { month: 'long' });

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Beginn des Tages, auf den ein Wert fällt. Tagesgenaue Datums-Strings liest
 * `new Date()` als UTC — westlich von Greenwich landete das Fest dadurch einen
 * Tag zu früh; darum explizit als lokale Mitternacht lesen.
 */
export function festDayStart(value: string | Date): Date {
	const d =
		typeof value === 'string' && DATE_ONLY.test(value)
			? new Date(`${value}T00:00:00`)
			: new Date(value);
	d.setHours(0, 0, 0, 0);
	return d;
}

/** Ganze Tage von heute bis zum Start; negativ, wenn der Start vorbei ist. */
function daysUntil(startDate: string, today: Date): number {
	return Math.round((festDayStart(startDate).getTime() - festDayStart(today).getTime()) / 86400000);
}

function formatDay(d: Date, withMonth: boolean): string {
	const base = `${WEEKDAYS[d.getDay()]} ${d.getDate()}.`;
	return withMonth ? `${base} ${MONTH_FORMAT.format(d)}` : base;
}

/** Jahr, in dem ein Fest beginnt — die Jahr-Zeile der kleinen Plakate. */
export function festYear(startDate: string): number {
	return festDayStart(startDate).getFullYear();
}

/** „Fr 24. – So 26. Juli" — Monat am Start nur, wenn er sich vom Ende unterscheidet. */
export function formatFestDateRange(startDate: string, endDate?: string | null): string {
	const start = festDayStart(startDate);
	const end = endDate ? festDayStart(endDate) : null;
	if (!end || end.getTime() === start.getTime()) {
		return formatDay(start, true);
	}
	const sameMonth =
		start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
	return `${formatDay(start, !sameMonth)} – ${formatDay(end, true)}`;
}

/**
 * Gröberer Countdown für weit entfernte Feste („in 3 Monaten") — der Stempel auf
 * den kleinen Plakaten der Festliste, wo Tagesgenauigkeit nichts sagt. Innerhalb
 * des ersten Monats bleibt es bei Tagen.
 */
export function festCountdownCoarse(startDate: string, today: Date = new Date()): string {
	const days = daysUntil(startDate, today);
	if (days <= 0) return 'heute!';
	if (days === 1) return 'morgen!';
	if (days < 30) return `in ${days} Tagen`;
	const months = Math.round(days / 30);
	return months === 1 ? 'in 1 Monat' : `in ${months} Monaten`;
}

/** „noch 4 Tage" / „morgen!" / „heute!" / „läuft gerade" / „vorbei" */
export function festCountdown(
	startDate: string,
	endDate?: string | null,
	today: Date = new Date()
): string {
	const days = daysUntil(startDate, today);
	if (days > 1) return `noch ${days} Tage`;
	if (days === 1) return 'morgen!';
	if (days === 0) return 'heute!';
	const end = festDayStart(endDate ?? startDate);
	return festDayStart(today).getTime() <= end.getTime() ? 'läuft gerade' : 'vorbei';
}
