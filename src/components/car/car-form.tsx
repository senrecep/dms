"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarIcon,
  Upload,
  FileText,
  X,
  Check,
  ChevronsUpDown,
  Send,
  Info,
  Loader2,
} from "lucide-react";
import { createCar } from "@/actions/car";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type LookupItem = { id: string; name: string };
type UserItem = { id: string; name: string; email: string; role: string; departmentName: string | null };

type CarFormProps = {
  sources: LookupItem[];
  systems: LookupItem[];
  processes: LookupItem[];
  customers: LookupItem[];
  products: LookupItem[];
  operations: LookupItem[];
  users: UserItem[];
  departments: LookupItem[];
  currentUserDepartmentId: string | null;
  suggestedCode: string;
};

const carFormSchema = z.object({
  carCode: z.string().min(1, "CAR code is required").max(50),
  sourceId: z.string().min(1, "Source is required"),
  systemId: z.string().optional(),
  processId: z.string().optional(),
  customerId: z.string().optional(),
  productId: z.string().optional(),
  operationId: z.string().optional(),
  relatedStandard: z.string().optional(),
  nonconformityDescription: z
    .string()
    .min(1, "Description is required")
    .max(2000),
  assigneeId: z.string().min(1, "Assignee is required"),
  requesterDepartmentId: z.string().min(1, "Requester department is required"),
  responsibleDepartmentId: z
    .string()
    .min(1, "Responsible department is required"),
  targetCompletionDate: z.string().min(1, "Target date is required"),
});

type CarFormValues = z.infer<typeof carFormSchema>;

export function CarForm({
  sources,
  systems,
  processes,
  customers,
  products,
  operations,
  users: userList,
  departments: departmentList,
  currentUserDepartmentId,
  suggestedCode,
}: CarFormProps) {
  const t = useTranslations("car");
  const tc = useTranslations("common");
  const ts = useTranslations("settings.users");

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: ts("roleAdmin"),
    MANAGER: ts("roleManager"),
    USER: ts("roleUser"),
  };

  function userSubtitle(user: UserItem): string {
    const parts: string[] = [];
    if (user.role) parts.push(ROLE_LABELS[user.role] ?? user.role);
    if (user.departmentName) parts.push(user.departmentName);
    return parts.join(" - ");
  }
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [notificationUserIds, setNotificationUserIds] = useState<string[]>([]);
  const [notificationUserOpen, setNotificationUserOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CarFormValues>({
    resolver: zodResolver(carFormSchema),
    defaultValues: {
      carCode: suggestedCode,
      sourceId: "",
      systemId: undefined,
      processId: undefined,
      customerId: undefined,
      productId: undefined,
      operationId: undefined,
      relatedStandard: "",
      nonconformityDescription: "",
      assigneeId: "",
      requesterDepartmentId: currentUserDepartmentId ?? "",
      responsibleDepartmentId: "",
      targetCompletionDate: "",
    },
  });

  function handleFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...newFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileRemove(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleNotificationUser(userId: string) {
    setNotificationUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }

  function removeNotificationUser(userId: string) {
    setNotificationUserIds((prev) => prev.filter((id) => id !== userId));
  }

  async function onSubmit(values: CarFormValues) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();

      // Append all form values
      formData.append("carCode", values.carCode);
      formData.append("sourceId", values.sourceId);
      if (values.systemId) formData.append("systemId", values.systemId);
      if (values.processId) formData.append("processId", values.processId);
      if (values.customerId) formData.append("customerId", values.customerId);
      if (values.productId) formData.append("productId", values.productId);
      if (values.operationId)
        formData.append("operationId", values.operationId);
      if (values.relatedStandard)
        formData.append("relatedStandard", values.relatedStandard);
      formData.append(
        "nonconformityDescription",
        values.nonconformityDescription,
      );
      formData.append("assigneeId", values.assigneeId);
      formData.append("requesterDepartmentId", values.requesterDepartmentId);
      formData.append(
        "responsibleDepartmentId",
        values.responsibleDepartmentId,
      );
      formData.append("targetCompletionDate", values.targetCompletionDate);

      // Append notification users
      for (const userId of notificationUserIds) {
        formData.append("notificationUserIds", userId);
      }

      // Append files
      for (const file of files) {
        formData.append("attachments", file);
      }

      const result = await createCar(formData);

      if (result.success) {
        toast.success(t("createSuccess"));
        router.push(`/car/${result.id}`);
      } else {
        toast.error(result.error || t("createError"));
      }
    } catch {
      toast.error(t("createError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedNotificationUsers = userList.filter((u) =>
    notificationUserIds.includes(u.id),
  );

  const selectedAssignee = userList.find(
    (u) => u.id === form.watch("assigneeId"),
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Section 1: Request Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              {t("formInformation")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* CAR Code */}
              <FormField
                control={form.control}
                name="carCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("carCode")} <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="DF-2026-1" />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {t("carCodeHint")}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Source */}
              <FormField
                control={form.control}
                name="sourceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("source")} <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("selectSource")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sources.map((source) => (
                          <SelectItem key={source.id} value={source.id}>
                            {source.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* System */}
              <FormField
                control={form.control}
                name="systemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("system")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("selectSystem")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {systems.map((system) => (
                          <SelectItem key={system.id} value={system.id}>
                            {system.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Process */}
              <FormField
                control={form.control}
                name="processId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("process")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("selectProcess")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {processes.map((process) => (
                          <SelectItem key={process.id} value={process.id}>
                            {process.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Customer */}
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customer")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("selectCustomer")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Product */}
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("product")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("selectProduct")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Operation */}
              <FormField
                control={form.control}
                name="operationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("operation")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("selectOperation")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {operations.map((operation) => (
                          <SelectItem key={operation.id} value={operation.id}>
                            {operation.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Related Standard */}
              <FormField
                control={form.control}
                name="relatedStandard"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("relatedStandard")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="ISO 9001:2015 - 8.5.2"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Target Completion Date */}
              <FormField
                control={form.control}
                name="targetCompletionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("targetCompletionDate")}{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="date"
                          {...field}
                          value={field.value ?? ""}
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("formDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Requester Department */}
              <FormField
                control={form.control}
                name="requesterDepartmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("requesterDepartment")}{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t("selectDepartment")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departmentList.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Responsible Department */}
              <FormField
                control={form.control}
                name="responsibleDepartmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("responsibleDepartment")}{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t("selectDepartment")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departmentList.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Assignee - Combobox */}
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>
                      {t("assignee")}{" "}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Popover
                      open={assigneeOpen}
                      onOpenChange={setAssigneeOpen}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={assigneeOpen}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {selectedAssignee
                              ? `${selectedAssignee.name}${selectedAssignee.departmentName ? ` (${selectedAssignee.departmentName})` : ""}`
                              : t("selectUser")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[min(300px,calc(100vw-2rem))] p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t("selectUser")} />
                          <CommandList>
                            <CommandEmpty>{t("noResults")}</CommandEmpty>
                            <CommandGroup>
                              {userList.map((user) => {
                                const sub = userSubtitle(user);
                                return (
                                  <CommandItem
                                    key={user.id}
                                    value={`${user.name} ${user.email} ${sub}`}
                                    onSelect={() => {
                                      field.onChange(user.id);
                                      setAssigneeOpen(false);
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
                                      <span className="text-sm font-medium">
                                        {user.name}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {sub || user.email}
                                      </span>
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
            </div>

            {/* Nonconformity Description - Full width */}
            <FormField
              control={form.control}
              name="nonconformityDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("nonconformityDescription")}{" "}
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={5}
                      maxLength={2000}
                      placeholder={t("nonconformityDescriptionHint")}
                      className="resize-y"
                    />
                  </FormControl>
                  <div className="flex justify-between">
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      {field.value?.length ?? 0}/2000
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section 3: Notifications & Attachments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t("formNotifications")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Notification Users - Multi-select Combobox */}
            <div className="space-y-2">
              <Label>{t("notificationUsers")}</Label>
              <Popover
                open={notificationUserOpen}
                onOpenChange={setNotificationUserOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={notificationUserOpen}
                    className="w-full justify-between"
                  >
                    {selectedNotificationUsers.length > 0
                      ? `${selectedNotificationUsers.length} ${t("selectUsers")}`
                      : t("selectUsers")}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(400px,calc(100vw-2rem))] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("selectUsers")} />
                    <CommandList>
                      <CommandEmpty>{t("noResults")}</CommandEmpty>
                      <CommandGroup>
                        {userList.map((user) => {
                          const sub = userSubtitle(user);
                          return (
                            <CommandItem
                              key={user.id}
                              value={`${user.name} ${user.email} ${sub}`}
                              onSelect={() => toggleNotificationUser(user.id)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  notificationUserIds.includes(user.id)
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {user.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {sub || user.email}
                                </span>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Selected notification user badges */}
              {selectedNotificationUsers.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {selectedNotificationUsers.map((user) => (
                    <Badge
                      key={user.id}
                      variant="secondary"
                      className="gap-1"
                    >
                      {user.name}
                      {user.departmentName && (
                        <span className="text-muted-foreground font-normal">
                          ({user.departmentName})
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeNotificationUser(user.id)}
                        aria-label={`${tc("actions.remove")} ${user.name}`}
                        className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* File Upload */}
            <div className="space-y-2">
              <Label>{t("attachments")}</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-11"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t("attachments")}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  aria-label={t("attachments")}
                  className="sr-only"
                  onChange={handleFileAdd}
                />
              </div>

              {/* File list */}
              {files.length > 0 && (
                <div className="space-y-2 pt-2">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-2 rounded-md border p-2"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 truncate">
                        <p className="truncate text-sm">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFileRemove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {t("submit")}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
