"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "USER" | "MANAGER" | "ADMIN";
  isActive: boolean;
};

type Department = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  managerId: string | null;
  managerName: string | null;
  members: Member[];
};

const ROLE_TRANSLATION_KEY = {
  USER: "roleUser",
  MANAGER: "roleManager",
  ADMIN: "roleAdmin",
} as const;

export function DepartmentDetailView({
  department,
}: {
  department: Department;
}) {
  const t = useTranslations("departments.detail");
  const tCommon = useTranslations("common");
  const tUsers = useTranslations("settings.users");
  const tForm = useTranslations("departments.form");

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/departments">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("back")}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{department.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Slug</p>
            <p className="text-sm">{department.slug}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {tForm("manager")}
            </p>
            <p className="text-sm">{department.managerName ?? "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {tCommon("labels.description")}
            </p>
            <p className="text-sm">{department.description || "-"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              {tCommon("labels.status")}
            </p>
            <Badge variant={department.isActive ? "default" : "secondary"}>
              {department.isActive
                ? tCommon("status.active")
                : tCommon("status.inactive")}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("members")}</CardTitle>
            <span className="text-sm text-muted-foreground">
              {t("memberCount", { count: department.members.length })}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {department.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noMembers")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tCommon("labels.name")}</TableHead>
                  <TableHead>{tCommon("labels.email")}</TableHead>
                  <TableHead>{tUsers("roles")}</TableHead>
                  <TableHead>{tCommon("labels.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {department.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {tUsers(ROLE_TRANSLATION_KEY[member.role])}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={member.isActive ? "default" : "secondary"}
                      >
                        {member.isActive
                          ? tCommon("status.active")
                          : tCommon("status.inactive")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
