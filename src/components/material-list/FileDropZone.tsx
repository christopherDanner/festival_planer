import React, { useRef, useState, useCallback } from 'react';
import { Upload, Camera } from 'lucide-react';
import { detectFileType } from '@/lib/materialImportService';
import { cn } from '@/lib/utils';

interface FileDropZoneProps {
	onFileSelected: (file: File) => void;
	accept: string;
	error?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const FileDropZone: React.FC<FileDropZoneProps> = ({ onFileSelected, accept, error }) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const cameraRef = useRef<HTMLInputElement>(null);
	const [dragOver, setDragOver] = useState(false);
	const [localError, setLocalError] = useState<string | null>(null);

	const validateAndSelect = useCallback(
		(file: File) => {
			setLocalError(null);
			if (file.size > MAX_FILE_SIZE) {
				setLocalError('Datei ist zu groß (max. 10 MB).');
				return;
			}
			const fileType = detectFileType(file);
			if (!fileType) {
				setLocalError('Nicht unterstütztes Dateiformat. Erlaubt: Excel, CSV, JPEG, PNG, PDF.');
				return;
			}
			onFileSelected(file);
		},
		[onFileSelected]
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setDragOver(false);
			const file = e.dataTransfer.files[0];
			if (file) validateAndSelect(file);
		},
		[validateAndSelect]
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(false);
	}, []);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) validateAndSelect(file);
			if (inputRef.current) inputRef.current.value = '';
		},
		[validateAndSelect]
	);

	const handleCameraChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) validateAndSelect(file);
			if (cameraRef.current) cameraRef.current.value = '';
		},
		[validateAndSelect]
	);

	const displayError = error || localError;

	return (
		<div className="space-y-2">
			{/* Camera button — prominent on mobile, hidden on desktop */}
			<button
				type="button"
				onClick={() => cameraRef.current?.click()}
				className="sm:hidden w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-4 text-primary font-medium active:bg-primary/10 transition-colors"
			>
				<Camera className="h-5 w-5" />
				Foto aufnehmen
			</button>

			{/* Drop zone / file picker */}
			<div
				onClick={() => inputRef.current?.click()}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				className={cn(
					'flex flex-col items-center justify-center gap-2 sm:gap-3 rounded-lg border-2 border-dashed p-6 sm:p-10 cursor-pointer transition-colors',
					dragOver
						? 'border-primary bg-primary/5'
						: 'border-muted-foreground/25 hover:border-muted-foreground/50'
				)}>
				<Upload className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
				<div className="text-center">
					<p className="font-medium text-sm sm:text-base">
						<span className="hidden sm:inline">Datei hierher ziehen oder klicken</span>
						<span className="sm:hidden">Datei aus Galerie oder Dateien wählen</span>
					</p>
					<p className="text-xs sm:text-sm text-muted-foreground mt-1">
						Excel, CSV, Bilder (JPEG/PNG), PDF
					</p>
				</div>
			</div>
			{displayError && <p className="text-sm text-destructive">{displayError}</p>}

			{/* Regular file picker */}
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				onChange={handleChange}
				className="hidden"
			/>
			{/* Camera capture input (mobile) */}
			<input
				ref={cameraRef}
				type="file"
				accept="image/*"
				capture="environment"
				onChange={handleCameraChange}
				className="hidden"
			/>
		</div>
	);
};

export default FileDropZone;
