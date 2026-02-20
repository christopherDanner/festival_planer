import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, X } from 'lucide-react';
import type { Station } from '@/lib/shiftService';

interface MaterialFiltersProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
	stationFilter: string;
	onStationFilterChange: (value: string) => void;
	supplierFilter: string;
	onSupplierFilterChange: (value: string) => void;
	categoryFilter: string;
	onCategoryFilterChange: (value: string) => void;
	stations: Station[];
	suppliers: string[];
	categories: string[];
	onReset: () => void;
}

const MaterialFilters: React.FC<MaterialFiltersProps> = ({
	searchTerm,
	onSearchChange,
	stationFilter,
	onStationFilterChange,
	supplierFilter,
	onSupplierFilterChange,
	categoryFilter,
	onCategoryFilterChange,
	stations,
	suppliers,
	categories,
	onReset
}) => {
	const hasFilters = searchTerm || stationFilter !== 'all' || supplierFilter !== 'all' || categoryFilter !== 'all';

	return (
		<Card>
			<CardContent className="pt-4 pb-4">
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							value={searchTerm}
							onChange={(e) => onSearchChange(e.target.value)}
							placeholder="Suche..."
							className="pl-9"
						/>
					</div>
					<Select value={stationFilter} onValueChange={onStationFilterChange}>
						<SelectTrigger>
							<SelectValue placeholder="Station" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Alle Stationen</SelectItem>
							<SelectItem value="__none__">Keine Station</SelectItem>
							{stations.map((s) => (
								<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={supplierFilter} onValueChange={onSupplierFilterChange}>
						<SelectTrigger>
							<SelectValue placeholder="Lieferant" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Alle Lieferanten</SelectItem>
							{suppliers.map((s) => (
								<SelectItem key={s} value={s}>{s}</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
						<SelectTrigger>
							<SelectValue placeholder="Kategorie" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Alle Kategorien</SelectItem>
							{categories.map((c) => (
								<SelectItem key={c} value={c}>{c}</SelectItem>
							))}
						</SelectContent>
					</Select>
					{hasFilters && (
						<Button variant="ghost" size="sm" onClick={onReset} className="gap-1">
							<X className="h-4 w-4" />
							Zurücksetzen
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
};

export default MaterialFilters;
