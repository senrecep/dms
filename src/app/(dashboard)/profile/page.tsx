import { getProfile } from "@/actions/profile";
import { ProfileForm } from "@/components/profile/profile-form";
import { getTranslations } from "next-intl/server";

export default async function ProfilePage() {
  const t = await getTranslations("profile");
  const profile = await getProfile();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      <ProfileForm profile={profile} />
    </div>
  );
}
