import { cn } from "@/lib/utils";

type Status = 'green' | 'yellow' | 'red' | 'gray';

const statusClasses: Record<Status, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  gray: 'bg-gray-400',
};

const statusText: Record<Status, string> = {
    green: 'On Time',
    yellow: 'Late',
    red: 'Very Late',
    gray: 'N/A'
}

interface StatusIndicatorProps {
  status: Status;
  showText?: boolean;
}

export function StatusIndicator({ status, showText = false }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-3 w-3 rounded-full", statusClasses[status])} />
      {showText && <span className="text-sm text-muted-foreground">{statusText[status]}</span>}
    </div>
  );
}
