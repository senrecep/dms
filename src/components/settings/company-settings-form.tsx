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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { saveCompanySettings } from "@/actions/settings";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Building2 } from "lucide-react";

type CompanySettingsFormProps = {
  initialSettings: {
    companyName: string;
    companyLogoUrl: string;
    pdfLanguage: string;
  };
};

export function CompanySettingsForm({ initialSettings }: CompanySettingsFormProps) {
  const t = useTranslations("settings.company");
  const router = useRouter();

  const [companyName, setCompanyName] = useState(initialSettings.companyName);
  const [companyLogoUrl, setCompanyLogoUrl] = useState(initialSettings.companyLogoUrl);
  const [pdfLanguage, setPdfLanguage] = useState(initialSettings.pdfLanguage || "tr");
  const [saving, setSaving] = useState(false);

  const hasChanges =
    companyName !== initialSettings.companyName ||
    companyLogoUrl !== initialSettings.companyLogoUrl ||
    pdfLanguage !== (initialSettings.pdfLanguage || "tr");

  async function handleSave() {
    setSaving(true);
    try {
      const result = await saveCompanySettings({
        company_name: companyName,
        company_logo_url: companyLogoUrl,
        pdf_language: pdfLanguage,
      });
      if (!result.success) {
        toast.error(result.error ?? "Failed to save");
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="size-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="company_name">{t("companyName")}</Label>
          <Input
            id="company_name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder={t("companyNamePlaceholder")}
            className="max-w-md"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_logo_url">{t("companyLogoUrl")}</Label>
          <Input
            id="company_logo_url"
            value={companyLogoUrl}
            onChange={(e) => setCompanyLogoUrl(e.target.value)}
            placeholder={t("companyLogoUrlPlaceholder")}
            className="max-w-md"
          />
          {companyLogoUrl && (
            <div className="mt-1">
              <p className="text-xs text-muted-foreground mb-1">{t("companyLogoPreview")}</p>
              <div className="border rounded-md p-2 bg-muted/30 inline-flex items-center justify-center max-w-48 max-h-14">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={companyLogoUrl}
                  alt="Company Logo"
                  className="max-h-10 max-w-44 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pdf_language">{t("pdfLanguage")}</Label>
          <Select value={pdfLanguage} onValueChange={setPdfLanguage}>
            <SelectTrigger id="pdf_language" className="max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tr">{t("pdfLanguageTr")}</SelectItem>
              <SelectItem value="en">{t("pdfLanguageEn")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t("pdfLanguageDescription")}
          </p>
        </div>

        {hasChanges && (
          <Button onClick={handleSave} disabled={saving} className="mt-2">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("save")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
