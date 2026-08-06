/** Mehrere Dateien hintereinander herunterladen (#119). */

/**
 * Pause zwischen zwei Downloads in ms. Ohne sie hält der Browser die
 * Folgedateien für unerwünschte Pop-ups und blockt sie.
 */
export const DOWNLOAD_GAP_MS = 350;

/**
 * Löst die Downloads der Reihe nach aus, mit {@link DOWNLOAD_GAP_MS} Pause
 * zwischen zwei Dateien. Ein Export, der genau eine Datei erzeugt, wartet nicht.
 */
export async function runDownloads(jobs: Array<() => void>): Promise<void> {
	for (let i = 0; i < jobs.length; i++) {
		jobs[i]();
		if (i < jobs.length - 1) {
			await new Promise((resolve) => setTimeout(resolve, DOWNLOAD_GAP_MS));
		}
	}
}
