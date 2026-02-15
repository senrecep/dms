"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
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
import { CheckCircle2 } from "lucide-react";

export default function SetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Parola en az 8 karakter olmalidir.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Parolalar eslesmiyor.");
      return;
    }

    if (!token) {
      setError("Gecersiz veya suresi dolmus link.");
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        setError("Parola belirlenirken bir hata olustu. Link gecersiz veya suresi dolmus olabilir.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Beklenmeyen bir hata olustu. Lutfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">
              DMS
            </CardTitle>
            <CardDescription>Parola Belirleme</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive text-center">
              Gecersiz veya suresi dolmus link. Lutfen yoneticinizden yeni bir
              davet linki talep edin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold tracking-tight">
              DMS
            </CardTitle>
            <CardDescription>Parola Belirleme</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
              <p className="text-sm text-muted-foreground">
                Parolaniz basariyla belirlendi. Artik giris yapabilirsiniz.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => router.push("/login")}
            >
              Giris Yap
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            DMS
          </CardTitle>
          <CardDescription>Parolanizi Belirleyin</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Yeni Parola</Label>
              <Input
                id="password"
                type="password"
                placeholder="En az 8 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Parola Tekrar</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Parolanizi tekrar girin"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : "Parolami Belirle"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
