import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Zap, UserPlus, Maximize, Minimize } from 'lucide-react';

interface ShiftPlanningHeaderProps {
	isFullscreen: boolean;
	onToggleFullscreen: () => void;
	onAddStation: () => void;
	onAutoAssign: () => void;
	onAddMember: () => void;
}

const ShiftPlanningHeader: React.FC<ShiftPlanningHeaderProps> = ({
	isFullscreen,
	onToggleFullscreen,
	onAddStation,
	onAutoAssign,
	onAddMember
}) => {
	return (
		<div className="flex items-center justify-between p-6 border-b bg-background">
			<div>
				<h2 className="text-2xl font-bold flex items-center gap-2">
					<Calendar className="h-6 w-6" />
					Station-spezifische Schichtplan Matrix
				</h2>
				<p className="text-muted-foreground">
					Jede Station kann ihre eigenen Schichten mit unterschiedlichen Zeiten haben.
				</p>
			</div>

			<div className="flex gap-2 items-center">
				<div className="h-8 w-px bg-border mx-2"></div>

				<Button
					variant="outline"
					size="sm"
					onClick={onToggleFullscreen}
					className="flex items-center gap-2">
					{isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
					{isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
				</Button>

				<div className="h-8 w-px bg-border mx-2"></div>

				<Button variant="outline" size="sm" onClick={onAddStation}>
					<MapPin className="h-4 w-4 mr-2" />
					Station hinzufügen
				</Button>

				<div className="h-8 w-px bg-border mx-2"></div>

				<Button
					variant="default"
					size="lg"
					className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-blue-500"
					onClick={onAutoAssign}>
					<Zap className="h-5 w-5 mr-2" />
					Automatische Zuteilung
				</Button>

				<div className="h-8 w-px bg-border mx-2"></div>

				<Button
					variant="outline"
					size="sm"
					onClick={onAddMember}
					className="flex items-center gap-2">
					<UserPlus className="h-4 w-4" />
					Mitglied hinzufügen
				</Button>
			</div>
		</div>
	);
};

export default ShiftPlanningHeader;
