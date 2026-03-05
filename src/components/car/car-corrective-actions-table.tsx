"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Plus, MoreHorizontal, Check, Users, UserMinus } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  deleteCorrectiveAction,
  addTeamMember,
  removeTeamMember,
} from "@/actions/car-corrective-actions";
import { CarCorrectiveActionDialog } from "./car-corrective-action-dialog";

type UserItem = { id: string; name: string; email?: string; role?: string; departmentName?: string | null };

type CorrectiveAction = {
  id: string;
  description: string;
  ownerId: string;
  targetDate: Date;
  status: string;
  results: string | null;
  cost: string | null;
  owner: UserItem | null;
  createdBy: UserItem | null;
  team: { user: UserItem }[];
};

type CarCorrectiveActionsTableProps = {
  carId: string;
  carStatus: string;
  actions: CorrectiveAction[];
  users: UserItem[];
  canEdit: boolean;
};

const ACTION_STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  IN_PROGRESS:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  COMPLETED:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  CANCELLED: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

const EDITABLE_STATUSES = [
  "PLANNED_ACTION",
  "ACTION_RESULTS",
  "PENDING_CLOSURE",
];

export function CarCorrectiveActionsTable({
  carId,
  carStatus,
  actions,
  users,
  canEdit,
}: CarCorrectiveActionsTableProps) {
  const t = useTranslations("car");
  const [isPending, startTransition] = useTransition();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | "complete">(
    "create",
  );
  const [selectedAction, setSelectedAction] = useState<
    CorrectiveAction | undefined
  >(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionToDelete, setActionToDelete] = useState<string | null>(null);
  const [teamPopoverOpen, setTeamPopoverOpen] = useState<string | null>(null);

  const isEditable = canEdit && EDITABLE_STATUSES.includes(carStatus);

  function openCreate() {
    setSelectedAction(undefined);
    setDialogMode("create");
    setDialogOpen(true);
  }

  function openEdit(action: CorrectiveAction) {
    setSelectedAction(action);
    setDialogMode("edit");
    setDialogOpen(true);
  }

  function openComplete(action: CorrectiveAction) {
    setSelectedAction(action);
    setDialogMode("complete");
    setDialogOpen(true);
  }

  function confirmDelete(actionId: string) {
    setActionToDelete(actionId);
    setDeleteDialogOpen(true);
  }

  function handleDelete() {
    if (!actionToDelete) return;
    startTransition(async () => {
      const result = await deleteCorrectiveAction(actionToDelete);
      if (result.success) {
        toast.success(t("deleteSuccess"));
      } else {
        toast.error(result.error);
      }
      setDeleteDialogOpen(false);
      setActionToDelete(null);
    });
  }

  function handleAddTeamMember(actionId: string, userId: string) {
    startTransition(async () => {
      const result = await addTeamMember(actionId, userId);
      if (result.success) {
        toast.success(t("addTeamMember"));
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRemoveTeamMember(actionId: string, userId: string) {
    startTransition(async () => {
      const result = await removeTeamMember(actionId, userId);
      if (result.success) {
        toast.success(t("removeTeamMember"));
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              {t("addCorrectiveAction")}
            </CardTitle>
            {isEditable && (
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                {t("addCorrectiveAction")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-4 text-center">
              {t("noCorrectiveActions")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>{t("actionDescription")}</TableHead>
                    <TableHead className="w-36">{t("actionOwner")}</TableHead>
                    <TableHead className="w-32">{t("actionTeam")}</TableHead>
                    <TableHead className="w-32">
                      {t("actionTargetDate")}
                    </TableHead>
                    <TableHead className="w-28">{t("actionStatus")}</TableHead>
                    <TableHead className="w-24">{t("actionCost")}</TableHead>
                    {isEditable && (
                      <TableHead className="w-16 text-right">
                        {t("actions")}
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.map((action, index) => {
                    const teamMembers = action.team.map((t) => t.user);
                    const availableUsers = users.filter(
                      (u) =>
                        !teamMembers.some((m) => m.id === u.id) &&
                        u.id !== action.ownerId,
                    );

                    return (
                      <TableRow key={action.id}>
                        <TableCell className="font-medium text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm line-clamp-2">
                            {action.description}
                          </p>
                          {action.results && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {t("actionResults")}: {action.results}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const ownerFull = users.find((u) => u.id === action.ownerId);
                            return (
                              <div className="flex flex-col">
                                <span className="text-sm">
                                  {action.owner?.name ?? "-"}
                                </span>
                                {ownerFull?.departmentName && (
                                  <span className="text-xs text-muted-foreground">
                                    {ownerFull.departmentName}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {teamMembers.length === 0 ? (
                              <span className="text-xs text-muted-foreground">
                                -
                              </span>
                            ) : (
                              teamMembers.map((member) => {
                                const memberFull = users.find((u) => u.id === member.id);
                                return (
                                <Badge
                                  key={member.id}
                                  variant="secondary"
                                  className="text-xs gap-1"
                                >
                                  {member.name}
                                  {memberFull?.departmentName && (
                                    <span className="text-muted-foreground font-normal">
                                      ({memberFull.departmentName})
                                    </span>
                                  )}
                                  {isEditable && (
                                    <button
                                      onClick={() =>
                                        handleRemoveTeamMember(
                                          action.id,
                                          member.id,
                                        )
                                      }
                                      disabled={isPending}
                                      className="hover:text-destructive transition-colors cursor-pointer p-1 -mr-1 rounded-full"
                                      aria-label={`${t("removeTeamMember")} ${member.name}`}
                                    >
                                      <UserMinus className="h-3 w-3" />
                                    </button>
                                  )}
                                </Badge>
                                );
                              })
                            )}
                            {isEditable && availableUsers.length > 0 && (
                              <Popover
                                open={teamPopoverOpen === action.id}
                                onOpenChange={(open) =>
                                  setTeamPopoverOpen(open ? action.id : null)
                                }
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    aria-label={t("addTeamMember")}
                                  >
                                    <Users className="h-3.5 w-3.5" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-56 p-0"
                                  align="start"
                                >
                                  <Command>
                                    <CommandInput
                                      placeholder={t("addTeamMember")}
                                    />
                                    <CommandList>
                                      <CommandEmpty>
                                        {t("noResults")}
                                      </CommandEmpty>
                                      <CommandGroup>
                                        {availableUsers.map((user) => (
                                          <CommandItem
                                            key={user.id}
                                            value={`${user.name} ${user.departmentName ?? ""}`}
                                            onSelect={() => {
                                              handleAddTeamMember(
                                                action.id,
                                                user.id,
                                              );
                                              setTeamPopoverOpen(null);
                                            }}
                                          >
                                            <div className="flex flex-col">
                                              <span className="text-sm">{user.name}</span>
                                              {user.departmentName && (
                                                <span className="text-xs text-muted-foreground">
                                                  {user.departmentName}
                                                </span>
                                              )}
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {format(new Date(action.targetDate), "dd.MM.yyyy", {
                              locale: tr,
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "border-0 text-xs",
                              ACTION_STATUS_COLORS[action.status] ??
                                "bg-gray-100 text-gray-800",
                            )}
                          >
                            {t(`actionStatus${action.status.charAt(0) + action.status.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {action.cost ?? "-"}
                          </span>
                        </TableCell>
                        {isEditable && (
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  aria-label={t("actions")}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEdit(action)}
                                >
                                  {t("editCorrectiveAction")}
                                </DropdownMenuItem>
                                {action.status !== "COMPLETED" &&
                                  action.status !== "CANCELLED" && (
                                    <DropdownMenuItem
                                      onClick={() => openComplete(action)}
                                    >
                                      <Check className="mr-2 h-4 w-4 text-green-600" />
                                      {t("completeAction")}
                                    </DropdownMenuItem>
                                  )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => confirmDelete(action.id)}
                                >
                                  {t("deleteAction")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit / Complete dialog */}
      <CarCorrectiveActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        carId={carId}
        mode={dialogMode}
        action={selectedAction}
        users={users}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmCancel")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteActionConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("deleteAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
