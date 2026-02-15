"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
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
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFilterStore } from "@/stores/filter-store";
import { getDocuments, type DocumentListItem, type DocumentFilters } from "@/actions/documents";
import { exportDocumentsToExcel } from "@/actions/export";
import { getDocumentColumns } from "./document-columns";
import { DocumentFilters as DocumentFiltersBar } from "./document-filters";
import { Download, Plus } from "lucide-react";
import Link from "next/link";

type DocumentTableProps = {
  initialData: DocumentListItem[];
  initialTotal: number;
  departments: { id: string; name: string }[];
};

export function DocumentTable({ initialData, initialTotal, departments }: DocumentTableProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { searchQuery, departmentFilter, documentTypeFilter, statusFilter } = useFilterStore();

  const columns = getDocumentColumns(t);

  const fetchData = useCallback(() => {
    const filters: DocumentFilters = {
      search: searchQuery || undefined,
      departmentId: departmentFilter ?? undefined,
      documentType: documentTypeFilter ?? undefined,
      status: statusFilter ?? undefined,
      page,
      pageSize,
    };

    startTransition(async () => {
      const result = await getDocuments(filters);
      setData(result.data);
      setTotal(result.total);
    });
  }, [searchQuery, departmentFilter, documentTypeFilter, statusFilter, page]);

  useEffect(() => {
    // Debounce search, fetch immediately for other filters
    const timer = setTimeout(fetchData, searchQuery ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchData, searchQuery]);

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

  const handleExport = async () => {
    const filters: DocumentFilters = {
      search: searchQuery || undefined,
      departmentId: departmentFilter ?? undefined,
      documentType: documentTypeFilter ?? undefined,
      status: statusFilter ?? undefined,
    };

    const result = await exportDocumentsToExcel(filters);
    const byteCharacters = atob(result.base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DocumentFiltersBar departments={departments} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
            <Download className="size-4" />
            {t("common.actions.export")}
          </Button>
          <Button asChild size="sm" className="gap-1">
            <Link href="/documents/upload">
              <Plus className="size-4" />
              {t("common.actions.upload")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={(header.column.columnDef.meta as Record<string, string>)?.className}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t("documents.list.empty")}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/documents/${row.original.id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className={(cell.column.columnDef.meta as Record<string, string>)?.className}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-3 px-2 sm:flex-row sm:justify-between">
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
