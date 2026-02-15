import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { departments, users } from "@/lib/db/schema";
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
import { CreateDepartmentDialog } from "@/components/departments/create-department-dialog";
import { EditDepartmentDialog } from "@/components/departments/edit-department-dialog";

export default async function DepartmentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN") redirect("/");

  const t = await getTranslations("departments");
  const tCommon = await getTranslations("common");

  const departmentList = await db
    .select({
      id: departments.id,
      name: departments.name,
      slug: departments.slug,
      description: departments.description,
      isActive: departments.isActive,
      managerId: departments.managerId,
      managerName: users.name,
    })
    .from(departments)
    .leftJoin(users, eq(departments.managerId, users.id))
    .where(eq(departments.isDeleted, false));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("list.title")}</h1>
        <CreateDepartmentDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("list.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {departmentList.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("list.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tCommon("labels.name")}</TableHead>
                  <TableHead>{t("form.manager")}</TableHead>
                  <TableHead>{tCommon("labels.status")}</TableHead>
                  <TableHead className="w-12">{tCommon("labels.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departmentList.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell>{dept.managerName ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={dept.isActive ? "default" : "secondary"}>
                        {dept.isActive
                          ? tCommon("status.active")
                          : tCommon("status.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <EditDepartmentDialog dept={dept} />
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
