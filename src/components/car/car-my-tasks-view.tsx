"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CarStatusBadge } from "@/components/car/car-status-badge";

// --- Types ---

type AssignedCar = {
  id: string;
  carCode: string;
  status: string;
  targetDate: Date;
  createdAt: Date;
  responsibleDeptName: string;
};

type AssignedAction = {
  id: string;
  carId: string;
  description: string;
  status: string;
  targetDate: Date;
  carCode: string;
};

type PendingClosure = {
  id: string;
  carCode: string;
  status: string;
  assigneeName: string;
  targetDate: Date;
  createdAt: Date;
  responsibleDeptName: string;
};

type CarMyTasksViewProps = {
  assignedCars: AssignedCar[];
  assignedActions: AssignedAction[];
  pendingClosures: PendingClosure[];
};

function isOverdue(date: Date): boolean {
  return new Date(date) < new Date();
}

export function CarMyTasksView({
  assignedCars,
  assignedActions,
  pendingClosures,
}: CarMyTasksViewProps) {
  const t = useTranslations("car.myTasks");
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Section 1: Assigned CARs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("assignedCars")}</span>
            {assignedCars.length > 0 && (
              <Badge variant="secondary">{assignedCars.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignedCars.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("noAssignedCars")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("carCode")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {t("department")}
                    </TableHead>
                    <TableHead>{t("targetDate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedCars.map((car) => (
                    <TableRow
                      key={car.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/car/${car.id}`)}
                    >
                      <TableCell>
                        <Link
                          href={`/car/${car.id}`}
                          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {car.carCode}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <CarStatusBadge status={car.status} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {car.responsibleDeptName}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            isOverdue(car.targetDate)
                              ? "text-red-600 font-medium dark:text-red-400"
                              : ""
                          }
                        >
                          {format(new Date(car.targetDate), "dd.MM.yyyy")}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Assigned Corrective Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("assignedActions")}</span>
            {assignedActions.length > 0 && (
              <Badge variant="secondary">{assignedActions.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignedActions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("noAssignedActions")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("carCode")}</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {t("actionDescription")}
                    </TableHead>
                    <TableHead>{t("actionStatus")}</TableHead>
                    <TableHead>{t("targetDate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedActions.map((action) => (
                    <TableRow
                      key={action.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/car/${action.carId}`)}
                    >
                      <TableCell>
                        <Link
                          href={`/car/${action.carId}`}
                          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {action.carCode}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[300px] truncate">
                        {action.description}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            action.status === "IN_PROGRESS"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {action.status === "OPEN"
                            ? t("actionOpen")
                            : action.status === "IN_PROGRESS"
                              ? t("actionInProgress")
                              : action.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            isOverdue(action.targetDate)
                              ? "text-red-600 font-medium dark:text-red-400"
                              : ""
                          }
                        >
                          {format(new Date(action.targetDate), "dd.MM.yyyy")}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Pending Closures */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t("pendingClosures")}</span>
            {pendingClosures.length > 0 && (
              <Badge variant="secondary">{pendingClosures.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingClosures.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("noPendingClosures")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("carCode")}</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      {t("assignee")}
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t("department")}
                    </TableHead>
                    <TableHead>{t("targetDate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingClosures.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/car/${item.id}`)}
                    >
                      <TableCell>
                        <Link
                          href={`/car/${item.id}`}
                          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.carCode}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {item.assigneeName}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {item.responsibleDeptName}
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.targetDate), "dd.MM.yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
