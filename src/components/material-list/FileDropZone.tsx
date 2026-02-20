import React, { useRef, useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
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

	const displayError = error || localError;

	return (
		<div className="space-y-2">
			<div
				onClick={() => inputRef.current?.click()}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				className={cn(
					'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors',
					dragOver
						? 'border-primary bg-primary/5'
						: 'border-muted-foreground/25 hover:border-muted-foreground/50'
				)}>
				<Upload className="h-10 w-10 text-muted-foreground" />
				<div className="text-center">
					<p className="font-medium">Datei hierher ziehen oder klicken</p>
					<p className="text-sm text-muted-foreground mt-1">
						Excel, CSV, Bilder (JPEG/PNG), PDF
					</p>
				</div>
			</div>
			{displayError && <p className="text-sm text-destructive">{displayError}</p>}
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				onChange={handleChange}
				className="hidden"
			/>
		</div>
	);
};

export default FileDropZone;
