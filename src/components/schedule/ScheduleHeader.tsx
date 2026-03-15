import { Button } from '@/components/ui/button';
import { Plus, FileDown } from 'lucide-react';

interface ScheduleHeaderProps {
  onAddDay: () => void;
  onExport: () => void;
  hasData: boolean;
}

export default function ScheduleHeader({ onAddDay, onExport, hasData }: ScheduleHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Ablaufplan
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={!hasData}
            className="gap-1.5"
          >
            <FileDown className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">PDF Export</span>
          </Button>
          <Button
            size="sm"
            onClick={onAddDay}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Tag hinzufügen</span>
          </Button>
        </div>
      </div>
      <div className="mt-3 h-px bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
    </div>
  );
}
