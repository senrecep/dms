"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Mail, Send, Check, Loader2, AlertCircle, Globe } from "lucide-react";
import { saveEmailSettings, sendTestEmail } from "@/actions/settings";
import { useTranslations } from "next-intl";

interface EmailSettingsFormProps {
  initialSettings: Record<string, string>;
}

const ERROR_CODE_MAP: Record<string, string> = {
  NAME_REQUIRED: "nameRequired",
  EMAIL_TEST_FAILED: "emailTestFailed",
  SETTING_SAVE_FAILED: "settingSaveFailed",
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden",
  DUPLICATE_ENTRY: "duplicateEntry",
  UNEXPECTED_ERROR: "unexpectedError",
};

export function EmailSettingsForm({ initialSettings }: EmailSettingsFormProps) {
  const router = useRouter();
  const t = useTranslations("settings.email");
  const tErrors = useTranslations("errors");

  const [provider, setProvider] = useState(
    initialSettings.email_provider || "resend"
  );
  const [emailLanguage, setEmailLanguage] = useState(
    initialSettings.email_language || "en"
  );
  const [fromAddress, setFromAddress] = useState(
    initialSettings.email_from || ""
  );
  const [resendApiKey, setResendApiKey] = useState(
    initialSettings.email_resend_api_key || ""
  );
  const [smtpHost, setSmtpHost] = useState(
    initialSettings.email_smtp_host || ""
  );
  const [smtpPort, setSmtpPort] = useState(
    initialSettings.email_smtp_port || "587"
  );
  const [smtpUser, setSmtpUser] = useState(
    initialSettings.email_smtp_user || ""
  );
  const [smtpPass, setSmtpPass] = useState(
    initialSettings.email_smtp_pass || ""
  );
  const [smtpSecure, setSmtpSecure] = useState(
    initialSettings.email_smtp_secure === "true"
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    error?: string;
  } | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    setSaved(false);

    try {
      const settings: Record<string, string> = {
        email_provider: provider,
        email_language: emailLanguage,
        email_from: fromAddress,
        email_resend_api_key: resendApiKey,
        email_smtp_host: smtpHost,
        email_smtp_port: smtpPort,
        email_smtp_user: smtpUser,
        email_smtp_pass: smtpPass,
        email_smtp_secure: smtpSecure ? "true" : "false",
      };

      const result = await saveEmailSettings(settings);
      if (!result.success) {
        const key = ERROR_CODE_MAP[result.errorCode] ?? "unexpectedError";
        setSaveError(tErrors(key));
        return;
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError(tErrors("unexpectedError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    if (!testEmail) return;
    setTesting(true);
    setTestResult(null);

    try {
      const result = await sendTestEmail(testEmail);
      if (!result.success) {
        const key = ERROR_CODE_MAP[result.errorCode] ?? "unexpectedError";
        setTestResult({ error: tErrors(key) });
      } else {
        setTestResult({ success: true });
      }
    } catch {
      setTestResult({ error: tErrors("unexpectedError") });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Ayarlari
        </CardTitle>
        <CardDescription>
          Email gonderim yontemini ve ayarlarini yapilandirin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label>Email Saglayici</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resend">Resend</SelectItem>
              <SelectItem value="smtp">SMTP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Email Language */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            {t("language")}
          </Label>
          <Select value={emailLanguage} onValueChange={setEmailLanguage}>
            <SelectTrigger className="max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tr">{t("languageTr")}</SelectItem>
              <SelectItem value="en">{t("languageEn")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t("languageDescription")}
          </p>
        </div>

        {/* From Address - shared */}
        <div className="space-y-2">
          <Label htmlFor="email-from">Gonderen Adresi</Label>
          <Input
            id="email-from"
            placeholder="DMS <noreply@example.com>"
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            className="max-w-sm"
          />
          <p className="text-xs text-muted-foreground">
            Ornek: DMS &lt;noreply@sirket.com&gt;
          </p>
        </div>

        <Separator />

        {/* Resend Settings */}
        {provider === "resend" && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Resend Ayarlari</h4>
            <div className="space-y-2">
              <Label htmlFor="resend-api-key">API Key</Label>
              <Input
                id="resend-api-key"
                type="password"
                placeholder="re_xxxxxxxxxxxxxxxxx"
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                className="max-w-sm"
              />
              <p className="text-xs text-muted-foreground">
                resend.com adresinden API key alabilirsiniz.
              </p>
            </div>
          </div>
        )}

        {/* SMTP Settings */}
        {provider === "smtp" && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">SMTP Ayarlari</h4>
            <div className="grid grid-cols-1 gap-4 max-w-lg sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">Host</Label>
                <Input
                  id="smtp-host"
                  placeholder="smtp.example.com"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-port">Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  placeholder="587"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 max-w-lg sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="smtp-user">Kullanici Adi</Label>
                <Input
                  id="smtp-user"
                  placeholder="user@example.com"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-pass">Parola</Label>
                <Input
                  id="smtp-pass"
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={smtpSecure} onCheckedChange={setSmtpSecure} />
              <Label>SSL/TLS (Port 465 icin aktif edin)</Label>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="mr-2 h-4 w-4" />
            ) : null}
            {saved ? "Kaydedildi" : "Kaydet"}
          </Button>
          {saveError && (
            <p className="text-sm text-destructive">{saveError}</p>
          )}
        </div>

        <Separator />

        {/* Test Email Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Test Email</h4>
          <p className="text-xs text-muted-foreground">
            Ayarlarinizi test etmek icin bir email gonderin.
          </p>
          <div className="flex flex-col gap-2 max-w-sm sm:flex-row sm:items-center">
            <Input
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={handleTestEmail}
              disabled={testing || !testEmail}
            >
              {testing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Gonder
            </Button>
          </div>
          {testResult?.success && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <Check className="h-4 w-4" />
              Test emaili basariyla gonderildi.
            </p>
          )}
          {testResult?.error && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {testResult.error}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
