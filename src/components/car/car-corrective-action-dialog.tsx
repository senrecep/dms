"use client";

import { useState, useTransition, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createCorrectiveAction,
  updateCorrectiveAction,
  completeCorrectiveAction,
} from "@/actions/car-corrective-actions";

type UserItem = { id: string; name: string; email?: string; role?: string; departmentName?: string | null };

type CorrectiveAction = {
  id: string;
  description: string;
  ownerId: string;
  targetDate: Date;
  status: string;
  results: string | null;
  cost: string | null;
  team: { user: UserItem }[];
};

type CarCorrectiveActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carId: string;
  mode: "create" | "edit" | "complete";
  action?: CorrectiveAction;
  users: UserItem[];
};

const createSchema = z.object({
  description: z.string().min(1).max(5000),
  ownerId: z.string().min(1),
  targetDate: z.string().min(1),
  teamMemberIds: z.array(z.string()).optional(),
});

const editSchema = z.object({
  description: z.string().min(1).max(5000).optional(),
  ownerId: z.string().min(1).optional(),
  targetDate: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
});

const completeSchema = z.object({
  results: z.string().min(1).max(5000),
  cost: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;
type CompleteForm = z.infer<typeof completeSchema>;

function toDateInputValue(date: Date): string {
  return new Date(date).toISOString().split("T")[0];
}

export function CarCorrectiveActionDialog({
  open,
  onOpenChange,
  carId,
  mode,
  action,
  users,
}: CarCorrectiveActionDialogProps) {
  const t = useTranslations("car");
  const ts = useTranslations("settings.users");
  const [isPending, startTransition] = useTransition();
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: ts("roleAdmin"),
    MANAGER: ts("roleManager"),
    USER: ts("roleUser"),
  };

  function userSubInfo(user: UserItem): string {
    const parts: string[] = [];
    if (user.role) parts.push(ROLE_LABELS[user.role] ?? user.role);
    if (user.departmentName) parts.push(user.departmentName);
    return parts.join(" - ");
  }

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      description: "",
      ownerId: "",
      targetDate: "",
      teamMemberIds: [],
    },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      description: action?.description ?? "",
      ownerId: action?.ownerId ?? "",
      targetDate: action ? toDateInputValue(action.targetDate) : "",
      status: (action?.status as EditForm["status"]) ?? "OPEN",
    },
  });

  const completeForm = useForm<CompleteForm>({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      results: action?.results ?? "",
      cost: action?.cost ?? "",
    },
  });

  // Reset forms when dialog opens
  useEffect(() => {
    if (open) {
      if (mode === "create") {
        createForm.reset({
          description: "",
          ownerId: "",
          targetDate: "",
          teamMemberIds: [],
        });
      } else if (mode === "edit" && action) {
        editForm.reset({
          description: action.description,
          ownerId: action.ownerId,
          targetDate: toDateInputValue(action.targetDate),
          status: action.status as EditForm["status"],
        });
      } else if (mode === "complete" && action) {
        completeForm.reset({
          results: action.results ?? "",
          cost: action.cost ?? "",
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, action?.id]);

  function onCreateSubmit(values: CreateForm) {
    startTransition(async () => {
      const result = await createCorrectiveAction(carId, {
        description: values.description,
        ownerId: values.ownerId,
        targetDate: new Date(values.targetDate).toISOString(),
        teamMemberIds: values.teamMemberIds,
      });
      if (result.success) {
        toast.success(t("addCorrectiveAction"));
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function onEditSubmit(values: EditForm) {
    if (!action) return;
    startTransition(async () => {
      const result = await updateCorrectiveAction(action.id, {
        description: values.description,
        ownerId: values.ownerId,
        targetDate: values.targetDate
          ? new Date(values.targetDate).toISOString()
          : undefined,
        status: values.status,
      });
      if (result.success) {
        toast.success(t("editCorrectiveAction"));
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function onCompleteSubmit(values: CompleteForm) {
    if (!action) return;
    startTransition(async () => {
      const result = await completeCorrectiveAction(action.id, {
        results: values.results,
        cost: values.cost ? parseFloat(values.cost) : undefined,
      });
      if (result.success) {
        toast.success(t("completeAction"));
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  const getTitle = () => {
    if (mode === "create") return t("addCorrectiveAction");
    if (mode === "edit") return t("editCorrectiveAction");
    return t("completeAction");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>

        {mode === "create" && (
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(onCreateSubmit)}
              className="space-y-4"
            >
              {/* Description */}
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("actionDescription")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        className="resize-none"
                        placeholder={t("actionDescription")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Owner */}
              <FormField
                control={createForm.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("actionOwner")}</FormLabel>
                    <Popover open={ownerOpen} onOpenChange={setOwnerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value
                              ? users.find((u) => u.id === field.value)?.name
                              : t("selectUser")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t("selectUser")} />
                          <CommandList>
                            <CommandEmpty>{t("noResults")}</CommandEmpty>
                            <CommandGroup>
                              {users.map((user) => {
                                const sub = userSubInfo(user);
                                return (
                                  <CommandItem
                                    key={user.id}
                                    value={`${user.name} ${user.email ?? ""} ${sub}`}
                                    onSelect={() => {
                                      field.onChange(user.id);
                                      setOwnerOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === user.id
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="text-sm">{user.name}</span>
                                      {sub && (
                                        <span className="text-xs text-muted-foreground">
                                          {sub}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Target Date */}
              <FormField
                control={createForm.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("actionTargetDate")}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ""}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Team Members */}
              <FormField
                control={createForm.control}
                name="teamMemberIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("actionTeam")}</FormLabel>
                    <Popover open={teamOpen} onOpenChange={setTeamOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between font-normal"
                          >
                            {t("addTeamMember")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t("selectUser")} />
                          <CommandList>
                            <CommandEmpty>{t("noResults")}</CommandEmpty>
                            <CommandGroup>
                              {users.map((user) => {
                                const selected = (
                                  field.value ?? []
                                ).includes(user.id);
                                const sub = userSubInfo(user);
                                return (
                                  <CommandItem
                                    key={user.id}
                                    value={`${user.name} ${user.email ?? ""} ${sub}`}
                                    onSelect={() => {
                                      const current = field.value ?? [];
                                      if (selected) {
                                        field.onChange(
                                          current.filter(
                                            (id) => id !== user.id,
                                          ),
                                        );
                                      } else {
                                        field.onChange([...current, user.id]);
                                      }
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selected
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="text-sm">{user.name}</span>
                                      {sub && (
                                        <span className="text-xs text-muted-foreground">
                                          {sub}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {/* Selected team members badges */}
                    {(field.value ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(field.value ?? []).map((memberId) => {
                          const user = users.find((u) => u.id === memberId);
                          if (!user) return null;
                          return (
                            <Badge
                              key={memberId}
                              variant="secondary"
                              className="gap-1"
                            >
                              {user.name}
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() =>
                                  field.onChange(
                                    (field.value ?? []).filter(
                                      (id) => id !== memberId,
                                    ),
                                  )
                                }
                              />
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? t("submitting") : t("addCorrectiveAction")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {mode === "edit" && (
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onEditSubmit)}
              className="space-y-4"
            >
              {/* Description */}
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("actionDescription")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        className="resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Owner */}
              <FormField
                control={editForm.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("actionOwner")}</FormLabel>
                    <Popover open={ownerOpen} onOpenChange={setOwnerOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value
                              ? users.find((u) => u.id === field.value)?.name
                              : t("selectUser")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t("selectUser")} />
                          <CommandList>
                            <CommandEmpty>{t("noResults")}</CommandEmpty>
                            <CommandGroup>
                              {users.map((user) => {
                                const sub = userSubInfo(user);
                                return (
                                  <CommandItem
                                    key={user.id}
                                    value={`${user.name} ${user.email ?? ""} ${sub}`}
                                    onSelect={() => {
                                      field.onChange(user.id);
                                      setOwnerOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === user.id
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="text-sm">{user.name}</span>
                                      {sub && (
                                        <span className="text-xs text-muted-foreground">
                                          {sub}
                                        </span>
                                      )}
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Target Date */}
              <FormField
                control={editForm.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("actionTargetDate")}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("actionStatus")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OPEN">
                          {t("actionStatusOpen")}
                        </SelectItem>
                        <SelectItem value="IN_PROGRESS">
                          {t("actionStatusInProgress")}
                        </SelectItem>
                        <SelectItem value="CANCELLED">
                          {t("actionStatusCancelled")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? t("submitting") : t("editCorrectiveAction")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {mode === "complete" && (
          <Form {...completeForm}>
            <form
              onSubmit={completeForm.handleSubmit(onCompleteSubmit)}
              className="space-y-4"
            >
              {/* Results */}
              <FormField
                control={completeForm.control}
                name="results"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("actionResults")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={5}
                        className="resize-none"
                        placeholder={t("actionResults")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cost */}
              <FormField
                control={completeForm.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("actionCost")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? t("submitting") : t("completeAction")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
