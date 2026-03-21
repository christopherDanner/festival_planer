import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X, Filter } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
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
	const isMobile = useIsMobile();
	const [filtersOpen, setFiltersOpen] = useState(false);
	const hasFilters = searchTerm || stationFilter !== 'all' || supplierFilter !== 'all' || categoryFilter !== 'all';
	const hasActiveFilters = stationFilter !== 'all' || supplierFilter !== 'all' || categoryFilter !== 'all';

	return (
		<div className="space-y-2">
			<div className="flex gap-2">
				{/* Search - always visible */}
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						value={searchTerm}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Suche..."
						className="pl-9 h-9"
					/>
				</div>
				{/* Mobile filter toggle */}
				{isMobile && (
					<Button variant="outline" size="sm" className="h-9 gap-1.5 shrink-0" onClick={() => setFiltersOpen(!filtersOpen)}>
						<Filter className="h-4 w-4" />
						{hasActiveFilters && <span className="h-2 w-2 rounded-full bg-primary" />}
					</Button>
				)}
			</div>
			{/* Filter selects - always visible on desktop, toggle on mobile */}
			{(!isMobile || filtersOpen) && (
				<div className="flex flex-wrap items-center gap-2">
					<Select value={stationFilter} onValueChange={onStationFilterChange}>
						<SelectTrigger className="w-full sm:w-[140px] h-9">
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
						<SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[140px] h-9">
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
						<SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[140px] h-9">
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
						<Button variant="ghost" size="sm" onClick={onReset} className="gap-1 h-9">
							<X className="h-4 w-4" />
							<span className="hidden sm:inline">Zurücksetzen</span>
						</Button>
					)}
				</div>
			)}
		</div>
	);
};

export default MaterialFilters;
