import { CAR_STATUS_COLORS } from "@/lib/car/workflow";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

type CarStatusBadgeProps = {
  status: string;
  className?: string;
};

export function CarStatusBadge({ status, className }: CarStatusBadgeProps) {
  const t = useTranslations("car.status");
  const colorClass =
    CAR_STATUS_COLORS[status] || "bg-gray-100 text-gray-800";

  return (
    <Badge
      variant="outline"
      className={`${colorClass} border-0 ${className || ""}`}
    >
      {t(status)}
    </Badge>
  );
}
