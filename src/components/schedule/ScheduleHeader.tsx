import { Button } from '@/components/ui/button';
import { Plus, FileDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ScheduleHeaderProps {
  onAddDay: () => void;
  onExport: () => void;
  hasData: boolean;
}

export default function ScheduleHeader({ onAddDay, onExport, hasData }: ScheduleHeaderProps) {
  const isMobile = useIsMobile();

  return (
    <div className="mb-3 sm:mb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">
          Ablaufplan
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={!hasData}
            className="gap-1.5 h-9"
          >
            <FileDown className="h-4 w-4 shrink-0" />
            {!isMobile && <span>PDF Export</span>}
          </Button>
          <Button
            size="sm"
            onClick={onAddDay}
            className="gap-1.5 h-9"
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!isMobile && <span>Tag hinzufügen</span>}
          </Button>
        </div>
      </div>
      <div className="mt-3 h-px bg-gradient-to-r from-primary/40 via-primary/20 to-transparent" />
    </div>
  );
}
