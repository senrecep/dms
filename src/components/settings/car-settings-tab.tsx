"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createLookupItem,
  updateLookupItem,
  deleteLookupItem,
  type LookupItem,
} from "@/actions/car-settings";

type LookupType =
  | "sources"
  | "systems"
  | "processes"
  | "customers"
  | "products"
  | "operations";

type LookupSectionProps = {
  type: LookupType;
  title: string;
  items: LookupItem[];
};

function LookupSection({ type, title, items: initialItems }: LookupSectionProps) {
  const t = useTranslations("settings");
  const [items, setItems] = useState<LookupItem[]>(initialItems);
  const [isPending, startTransition] = useTransition();

  // Add dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addSortOrder, setAddSortOrder] = useState(0);

  // Edit dialog state
  const [editItem, setEditItem] = useState<LookupItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [isEditOpen, setIsEditOpen] = useState(false);

  function handleAdd() {
    if (!addName.trim()) return;
    startTransition(async () => {
      const result = await createLookupItem(type, {
        name: addName.trim(),
        sortOrder: addSortOrder,
      });
      if (result.success) {
        const newItem: LookupItem = {
          id: crypto.randomUUID(),
          name: addName.trim(),
          isActive: true,
          sortOrder: addSortOrder,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setItems((prev) =>
          [...prev, newItem].sort((a, b) =>
            a.sortOrder !== b.sortOrder
              ? a.sortOrder - b.sortOrder
              : a.name.localeCompare(b.name),
          ),
        );
        setAddName("");
        setAddSortOrder(0);
        setIsAddOpen(false);
        toast.success(t("itemAdded"));
      } else {
        toast.error(result.error);
      }
    });
  }

  function openEdit(item: LookupItem) {
    setEditItem(item);
    setEditName(item.name);
    setEditSortOrder(item.sortOrder);
    setIsEditOpen(true);
  }

  function handleEdit() {
    if (!editItem || !editName.trim()) return;
    startTransition(async () => {
      const result = await updateLookupItem(editItem.id, type, {
        name: editName.trim(),
        sortOrder: editSortOrder,
      });
      if (result.success) {
        setItems((prev) =>
          prev
            .map((i) =>
              i.id === editItem.id
                ? { ...i, name: editName.trim(), sortOrder: editSortOrder }
                : i,
            )
            .sort((a, b) =>
              a.sortOrder !== b.sortOrder
                ? a.sortOrder - b.sortOrder
                : a.name.localeCompare(b.name),
            ),
        );
        setIsEditOpen(false);
        setEditItem(null);
        toast.success(t("itemUpdated"));
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleToggleActive(item: LookupItem) {
    startTransition(async () => {
      const result = await updateLookupItem(item.id, type, {
        isActive: !item.isActive,
      });
      if (result.success) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, isActive: !item.isActive } : i,
          ),
        );
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteLookupItem(id, type);
      if (result.success) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        toast.success(t("itemDeleted"));
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Plus className="size-4" />
              {t("addItem")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("addItem")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor={`add-name-${type}`}>{t("itemName")}</Label>
                <Input
                  id={`add-name-${type}`}
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`add-sort-${type}`}>{t("sortOrder")}</Label>
                <Input
                  id={`add-sort-${type}`}
                  type="number"
                  min={0}
                  value={addSortOrder}
                  onChange={(e) => setAddSortOrder(Number(e.target.value))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={isPending}
              >
                {t("cancel")}
              </Button>
              <Button onClick={handleAdd} disabled={isPending || !addName.trim()}>
                {t("addItem")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm py-4 text-center">
            {t("noItems")}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("itemName")}</TableHead>
                <TableHead className="w-28 text-center">{t("sortOrder")}</TableHead>
                <TableHead className="w-24 text-center">{t("active")}</TableHead>
                <TableHead className="w-24 text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {item.sortOrder}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={item.isActive}
                      onCheckedChange={() => handleToggleActive(item)}
                      disabled={isPending}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => openEdit(item)}
                        disabled={isPending}
                      >
                        <Pencil className="size-3.5" />
                        <span className="sr-only">{t("editItem")}</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-destructive hover:text-destructive"
                            disabled={isPending}
                          >
                            <Trash2 className="size-3.5" />
                            <span className="sr-only">{t("deleteItem")}</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("confirmDeleteDescription")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(item.id)}
                              className="bg-destructive text-white hover:bg-destructive/90"
                            >
                              {t("deleteItem")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editItem")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor={`edit-name-${type}`}>{t("itemName")}</Label>
              <Input
                id={`edit-name-${type}`}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEdit()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-sort-${type}`}>{t("sortOrder")}</Label>
              <Input
                id={`edit-sort-${type}`}
                type="number"
                min={0}
                value={editSortOrder}
                onChange={(e) => setEditSortOrder(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              disabled={isPending}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handleEdit} disabled={isPending || !editName.trim()}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export type CarSettingsTabProps = {
  sources: LookupItem[];
  systems: LookupItem[];
  processes: LookupItem[];
  customers: LookupItem[];
  products: LookupItem[];
  operations: LookupItem[];
};

export function CarSettingsTab({
  sources,
  systems,
  processes,
  customers,
  products,
  operations,
}: CarSettingsTabProps) {
  const t = useTranslations("settings");

  return (
    <div className="space-y-6">
      <LookupSection type="sources" title={t("carSources")} items={sources} />
      <LookupSection type="systems" title={t("carSystems")} items={systems} />
      <LookupSection type="processes" title={t("carProcesses")} items={processes} />
      <LookupSection type="customers" title={t("carCustomers")} items={customers} />
      <LookupSection type="products" title={t("carProducts")} items={products} />
      <LookupSection type="operations" title={t("carOperations")} items={operations} />
    </div>
  );
}
