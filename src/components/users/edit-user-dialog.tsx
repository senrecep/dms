"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUser, getDepartmentsList } from "@/actions/users";
import { Pencil } from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "USER";
  departmentId: string | null;
  isActive: boolean;
};

export function EditUserDialog({ user }: { user: User }) {
  const t = useTranslations("settings.users");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [departmentId, setDepartmentId] = useState(user.departmentId ?? "");
  const [isActive, setIsActive] = useState(user.isActive);

  useEffect(() => {
    if (open) {
      getDepartmentsList().then(setDepartments);
    }
  }, [open]);

  function resetForm() {
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setDepartmentId(user.departmentId ?? "");
    setIsActive(user.isActive);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await updateUser(user.id, {
        name,
        email,
        role,
        departmentId: departmentId || undefined,
        isActive,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError(tCommon("status.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {tCommon("actions.edit")} - {user.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`edit-name-${user.id}`}>
              {tCommon("labels.name")}
            </Label>
            <Input
              id={`edit-name-${user.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-email-${user.id}`}>
              {tCommon("labels.email")}
            </Label>
            <Input
              id={`edit-email-${user.id}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t("roles")}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "ADMIN" | "MANAGER" | "USER")}>
              <SelectTrigger>
                <SelectValue placeholder="-" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">USER</SelectItem>
                <SelectItem value="MANAGER">MANAGER</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{tCommon("labels.department")}</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="-" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor={`edit-active-${user.id}`}>
              {tCommon("labels.status")}
            </Label>
            <Switch
              id={`edit-active-${user.id}`}
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {tCommon("actions.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? tCommon("status.loading") : tCommon("actions.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
