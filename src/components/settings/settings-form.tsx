"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateSetting } from "@/actions/settings";
import { Check, Loader2 } from "lucide-react";

type Setting = {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: Date;
};

const SETTING_LABELS: Record<string, string> = {
  app_name: "Application Name",
  default_reminder_days: "Default Reminder Days",
  default_escalation_days: "Default Escalation Days",
};

const SETTING_TYPES: Record<string, "text" | "number"> = {
  app_name: "text",
  default_reminder_days: "number",
  default_escalation_days: "number",
};

export function SettingsForm({ settings }: { settings: Setting[] }) {
  const t = useTranslations("settings.general");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value]))
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function handleSave(key: string) {
    setSaving(key);
    try {
      await updateSetting(key, values[key]);
      setSaved(key);
      router.refresh();
      setTimeout(() => setSaved(null), 2000);
    } finally {
      setSaving(null);
    }
  }

  const original = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {settings.map((setting) => (
          <div key={setting.key} className="space-y-2">
            <Label htmlFor={setting.key}>
              {SETTING_LABELS[setting.key] ?? setting.key}
            </Label>
            {setting.description && (
              <p className="text-xs text-muted-foreground">
                {setting.description}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Input
                id={setting.key}
                type={SETTING_TYPES[setting.key] ?? "text"}
                value={values[setting.key] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [setting.key]: e.target.value }))
                }
                className="max-w-sm"
              />
              {values[setting.key] !== original[setting.key] && (
                <Button
                  size="sm"
                  onClick={() => handleSave(setting.key)}
                  disabled={saving === setting.key}
                >
                  {saving === setting.key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    tCommon("actions.save")
                  )}
                </Button>
              )}
              {saved === setting.key && (
                <Check className="h-4 w-4 text-green-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(setting.updatedAt).toLocaleString("tr-TR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
