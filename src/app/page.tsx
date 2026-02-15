import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function Home() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session) {
      redirect("/dashboard");
    }
  } catch {
    // DB not ready or auth error - redirect to login
  }

  redirect("/login");
}
