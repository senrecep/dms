"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getCars, type CarListItem, type CarFilters } from "@/actions/car";
import { CarStatusBadge } from "@/components/car/car-status-badge";
import { CAR_STATUS_ORDER } from "@/lib/car/workflow";
import { format } from "date-fns";
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  ArrowUpDown,
  X,
} from "lucide-react";
import Link from "next/link";

type CarListProps = {
  initialData: CarListItem[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
  sources: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  initialFilters?: CarFilters;
};

export function CarList({
  initialData,
  initialTotal,
  initialPage,
  initialPageSize,
  sources,
  departments,
  initialFilters,
}: CarListProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(initialPage);
  const pageSize = initialPageSize;

  // Filter states
  const [search, setSearch] = useState(initialFilters?.search ?? "");
  const [statusFilter, setStatusFilter] = useState<string[]>(
    initialFilters?.status ?? [],
  );
  const [sourceFilter, setSourceFilter] = useState(
    initialFilters?.sourceId ?? "",
  );
  const [requesterDeptFilter, setRequesterDeptFilter] = useState(
    initialFilters?.requesterDepartmentId ?? "",
  );
  const [responsibleDeptFilter, setResponsibleDeptFilter] = useState(
    initialFilters?.responsibleDepartmentId ?? "",
  );
  const [overdueFilter, setOverdueFilter] = useState(
    initialFilters?.overdue ?? false,
  );
  const [showFilters, setShowFilters] = useState(false);

  const columns: ColumnDef<CarListItem>[] = [
    {
      accessorKey: "carCode",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-3 h-10"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("car.carCode")}
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link
          href={`/car/${row.original.id}`}
          className="font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.getValue("carCode")}
        </Link>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="-ml-3 h-10"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {t("common.labels.date")}
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => format(new Date(row.getValue("createdAt")), "dd.MM.yyyy"),
    },
    {
      accessorKey: "sourceName",
      meta: { className: "hidden md:table-cell" },
      header: t("car.source"),
    },
    {
      accessorKey: "requesterDepartmentName",
      meta: { className: "hidden lg:table-cell" },
      header: t("car.requesterDepartment"),
    },
    {
      accessorKey: "responsibleDepartmentName",
      meta: { className: "hidden lg:table-cell" },
      header: t("car.responsibleDepartment"),
    },
    {
      accessorKey: "assigneeName",
      meta: { className: "hidden xl:table-cell" },
      header: t("car.assignee"),
    },
    {
      accessorKey: "targetCompletionDate",
      meta: { className: "hidden md:table-cell" },
      header: t("car.targetCompletionDate"),
      cell: ({ row }) => {
        const date = new Date(row.getValue("targetCompletionDate"));
        const isOverdue = row.original.isOverdue;
        return (
          <span className={isOverdue ? "text-red-600 font-medium" : ""}>
            {format(date, "dd.MM.yyyy")}
            {isOverdue && (
              <AlertTriangle className="inline ml-1 size-3.5 text-red-600" />
            )}
          </span>
        );
      },
    },
    {
      accessorKey: "closingDate",
      meta: { className: "hidden xl:table-cell" },
      header: t("car.closingDate"),
      cell: ({ row }) => {
        const date = row.getValue<Date | null>("closingDate");
        return date ? format(new Date(date), "dd.MM.yyyy") : "-";
      },
    },
    {
      accessorKey: "status",
      header: t("common.labels.status"),
      cell: ({ row }) => <CarStatusBadge status={row.getValue("status")} />,
    },
  ];

  const fetchData = useCallback(() => {
    const filters: CarFilters = {
      search: search || undefined,
      status: statusFilter.length > 0 ? statusFilter : undefined,
      sourceId: sourceFilter || undefined,
      requesterDepartmentId: requesterDeptFilter || undefined,
      responsibleDepartmentId: responsibleDeptFilter || undefined,
      overdue: overdueFilter || undefined,
      page,
      pageSize,
    };

    startTransition(async () => {
      const result = await getCars(filters);
      setData(result.items);
      setTotal(result.total);
    });
  }, [
    search,
    statusFilter,
    sourceFilter,
    requesterDeptFilter,
    responsibleDeptFilter,
    overdueFilter,
    page,
    pageSize,
  ]);

  useEffect(() => {
    const timer = setTimeout(fetchData, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchData, search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sourceFilter, requesterDeptFilter, responsibleDeptFilter, overdueFilter]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pageSize),
  });

  const totalPages = Math.ceil(total / pageSize);

  const hasActiveFilters =
    statusFilter.length > 0 ||
    sourceFilter ||
    requesterDeptFilter ||
    responsibleDeptFilter ||
    overdueFilter;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter([]);
    setSourceFilter("");
    setRequesterDeptFilter("");
    setResponsibleDeptFilter("");
    setOverdueFilter(false);
  };

  const toggleStatus = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with search and actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("car.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? "secondary" : "outline"}
            size="default"
            onClick={() => setShowFilters((v) => !v)}
            className="gap-1"
          >
            <Filter className="size-4" />
            {t("car.filters")}
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                !
              </Badge>
            )}
          </Button>
        </div>
        <Button asChild size="default" className="gap-1">
          <Link href="/car/create">
            <Plus className="size-4" />
            {t("car.newCar")}
          </Link>
        </Button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Status multi-select via badges */}
              <div className="sm:col-span-2 lg:col-span-4">
                <p className="text-sm font-medium mb-2">{t("common.labels.status")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {CAR_STATUS_ORDER.map((status) => (
                    <Badge
                      key={status}
                      variant={statusFilter.includes(status) ? "default" : "outline"}
                      className="cursor-pointer select-none"
                      onClick={() => toggleStatus(status)}
                    >
                      {t(`car.status.${status}`)}
                    </Badge>
                  ))}
                  <Badge
                    variant={statusFilter.includes("CANCELLED") ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleStatus("CANCELLED")}
                  >
                    {t("car.status.CANCELLED")}
                  </Badge>
                </div>
              </div>

              {/* Source filter */}
              <div>
                <p className="text-sm font-medium mb-1.5">{t("car.source")}</p>
                <Select
                  value={sourceFilter || "__all__"}
                  onValueChange={(v) => setSourceFilter(v === "__all__" ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("car.allSources")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("car.allSources")}</SelectItem>
                    {sources.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Requester department filter */}
              <div>
                <p className="text-sm font-medium mb-1.5">{t("car.requesterDepartment")}</p>
                <Select
                  value={requesterDeptFilter || "__all__"}
                  onValueChange={(v) => setRequesterDeptFilter(v === "__all__" ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("car.allDepartments")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("car.allDepartments")}</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Responsible department filter */}
              <div>
                <p className="text-sm font-medium mb-1.5">{t("car.responsibleDepartment")}</p>
                <Select
                  value={responsibleDeptFilter || "__all__"}
                  onValueChange={(v) => setResponsibleDeptFilter(v === "__all__" ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("car.allDepartments")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("car.allDepartments")}</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Overdue toggle */}
              <div className="flex items-end">
                <Button
                  variant={overdueFilter ? "destructive" : "outline"}
                  size="default"
                  onClick={() => setOverdueFilter((v) => !v)}
                  className="gap-1 w-full"
                >
                  <AlertTriangle className="size-4" />
                  {t("car.overdue")}
                </Button>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="size-3.5" />
                  {t("common.actions.filter")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-[800px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      (header.column.columnDef.meta as Record<string, string>)
                        ?.className
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columns.length }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t("car.noResults")}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/car/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        (cell.column.columnDef.meta as Record<string, string>)
                          ?.className
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col items-start gap-3 px-2 sm:flex-row sm:justify-between">
          <p className="text-muted-foreground text-sm">
            {t("common.pagination.showing")} {(page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, total)} {t("common.pagination.of")} {total}{" "}
            {t("common.pagination.entries")}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              {t("common.pagination.previous")}
            </Button>
            <span className="text-sm">
              {t("common.pagination.page")} {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              {t("common.pagination.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
