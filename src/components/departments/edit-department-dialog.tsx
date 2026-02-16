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
import { Switch } from "@/components/ui/switch";
import { updateDepartment } from "@/actions/departments";
import { getDepartmentManagerCandidates } from "@/actions/departments-helpers";
import { Pencil } from "lucide-react";

type Department = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  managerId: string | null;
  isActive: boolean;
};

const ERROR_CODE_MAP: Record<string, string> = {
  SLUG_EXISTS: "departmentSlugExists",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  DUPLICATE_ENTRY: "duplicateEntry",
  REFERENCE_ERROR: "referenceError",
  UNEXPECTED_ERROR: "unexpectedError",
};

export function EditDepartmentDialog({ dept }: { dept: Department }) {
  const t = useTranslations("departments");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);

  const [name, setName] = useState(dept.name);
  const [slug, setSlug] = useState(dept.slug);
  const [description, setDescription] = useState(dept.description ?? "");
  const [managerId, setManagerId] = useState(dept.managerId ?? "");
  const [isActive, setIsActive] = useState(dept.isActive);

  useEffect(() => {
    if (open) {
      getDepartmentManagerCandidates().then(setManagers);
    }
  }, [open]);

  function resetForm() {
    setName(dept.name);
    setSlug(dept.slug);
    setDescription(dept.description ?? "");
    setManagerId(dept.managerId ?? "");
    setIsActive(dept.isActive);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await updateDepartment(dept.id, {
        name,
        slug,
        description: description || undefined,
        managerId: managerId || undefined,
        isActive,
      });

      if (!result.success) {
        const key = ERROR_CODE_MAP[result.errorCode] ?? "unexpectedError";
        setError(tErrors(key));
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError(tErrors("unexpectedError"));
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
          <DialogTitle>{t("form.name")} - {dept.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`edit-name-${dept.id}`}>{t("form.name")}</Label>
            <Input
              id={`edit-name-${dept.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-slug-${dept.id}`}>{t("form.slug")}</Label>
            <Input
              id={`edit-slug-${dept.id}`}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              pattern="[a-z0-9-]+"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-desc-${dept.id}`}>{t("form.description")}</Label>
            <Input
              id={`edit-desc-${dept.id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("form.manager")}</Label>
            <Select value={managerId} onValueChange={setManagerId}>
              <SelectTrigger>
                <SelectValue placeholder="-" />
              </SelectTrigger>
              <SelectContent>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>{tCommon("labels.status")}</Label>
            <Switch
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
