import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { getCarById } from "@/actions/car";
import { hasPermission } from "@/actions/user-permissions";
import { getAllActiveUsers } from "@/actions/documents";
import { CarDetailView } from "@/components/car/car-detail-view";

export const metadata: Metadata = {
  title: "CAR Detail",
  description: "Corrective Action Request detail - root cause analysis, corrective actions, and status tracking.",
  robots: { index: false, follow: false },
};

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const car = await getCarById(id);
  if (!car) notFound();

  const userRole = (session.user as { role?: string }).role;
  const canClose =
    (await hasPermission(session.user.id, "CLOSE_CAR")) ||
    userRole === "ADMIN";
  const isAssignee = car.assigneeId === session.user.id;
  const isRequester = car.requesterId === session.user.id;
  const isAdmin = userRole === "ADMIN";

  const allUsers = await getAllActiveUsers();
  const usersList = allUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    departmentName: u.departmentName,
  }));

  return (
    <CarDetailView
      car={car}
      canClose={canClose}
      isAssignee={isAssignee}
      isRequester={isRequester}
      isAdmin={isAdmin}
      currentUserId={session.user.id}
      users={usersList}
    />
  );
}
