import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  ok: "bg-[hsl(var(--status-ok))] text-white border-transparent",
  warning: "bg-[hsl(var(--status-warning))] text-white border-transparent",
  critical: "bg-[hsl(var(--status-critical))] text-white border-transparent",
  unknown: "bg-[hsl(var(--status-unknown))] text-white border-transparent",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge className={cn(statusColors[status] ?? statusColors.unknown, className)}>
      {status}
    </Badge>
  );
}
