"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createUser, getDepartmentsList } from "@/actions/users";
import { Plus } from "lucide-react";

export function CreateUserDialog() {
  const t = useTranslations("settings.users");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "MANAGER" | "USER">("USER");
  const [departmentId, setDepartmentId] = useState("");

  useEffect(() => {
    if (open) {
      getDepartmentsList().then(setDepartments);
    }
  }, [open]);

  function resetForm() {
    setName("");
    setEmail("");
    setRole("USER");
    setDepartmentId("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await createUser({
        name,
        email,
        role,
        departmentId: departmentId || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        resetForm();
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
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {t("addUser")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addUser")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">{tCommon("labels.name")}</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">{tCommon("labels.email")}</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Kullaniciya parola belirleme linki email ile gonderilecektir.
            </p>
          </div>
          <div className="space-y-2">
            <Label>{t("roles")}</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as "ADMIN" | "MANAGER" | "USER")}
            >
              <SelectTrigger>
                <SelectValue />
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
              {loading ? tCommon("status.loading") : tCommon("actions.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
