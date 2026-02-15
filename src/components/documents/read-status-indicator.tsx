import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Minus } from "lucide-react";

type ReadStatusIndicatorProps = {
  confirmed: number;
  total: number;
  status: string;
};

export function ReadStatusIndicator({ confirmed, total, status }: ReadStatusIndicatorProps) {
  if (status !== "PUBLISHED" || total === 0) {
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Minus className="size-4" />
      </span>
    );
  }

  if (confirmed === total) {
    return (
      <span className="flex items-center gap-1 text-green-600">
        <CheckCircle2 className="size-4" />
        <span className="text-xs">{confirmed}/{total}</span>
      </span>
    );
  }

  if (confirmed === 0) {
    return (
      <span className="flex items-center gap-1 text-red-500">
        <Circle className="size-4" />
        <span className="text-xs">0/{total}</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-amber-500">
      <Circle className="size-4 fill-current" />
      <span className="text-xs">{confirmed}/{total}</span>
    </span>
  );
}
