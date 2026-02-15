import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { users, departments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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
import { CreateUserDialog } from "@/components/users/create-user-dialog";
import { EditUserDialog } from "@/components/users/edit-user-dialog";
import { ResetPasswordButton } from "@/components/users/reset-password-button";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN") redirect("/");

  const t = await getTranslations("settings.users");
  const tCommon = await getTranslations("common");

  const userList = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      departmentId: users.departmentId,
      departmentName: departments.name,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <CreateUserDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tCommon("labels.name")}</TableHead>
                <TableHead>{tCommon("labels.email")}</TableHead>
                <TableHead>{t("roles")}</TableHead>
                <TableHead>{tCommon("labels.department")}</TableHead>
                <TableHead>{tCommon("labels.status")}</TableHead>
                <TableHead className="w-24">{tCommon("labels.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userList.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{u.role}</Badge>
                  </TableCell>
                  <TableCell>{u.departmentName ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={u.isActive ? "default" : "secondary"}>
                      {u.isActive
                        ? tCommon("status.active")
                        : tCommon("status.inactive")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <ResetPasswordButton userId={u.id} />
                      <EditUserDialog
                        user={{
                          id: u.id,
                          name: u.name,
                          email: u.email,
                          role: u.role as "ADMIN" | "MANAGER" | "USER",
                          departmentId: u.departmentId,
                          isActive: u.isActive,
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
