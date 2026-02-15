"use client";

import { useTransition } from "react";
import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { setUserLocale } from "@/lib/locale";

const locales = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
] as const;

export function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleLocaleChange = (locale: string) => {
    startTransition(async () => {
      await setUserLocale(locale);
      router.refresh();
    });
  };

  const current = locales.find((l) => l.code === currentLocale) ?? locales[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title={current.label} disabled={isPending}>
          <Languages className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            onClick={() => handleLocaleChange(locale.code)}
            className={currentLocale === locale.code ? "bg-accent" : ""}
          >
            {locale.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
