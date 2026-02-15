"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Tags,
  Building2,
  UserCheck,
  Users,
  Upload,
  ArrowRight,
  ArrowDown,
  Mail,
  BookOpenCheck,
  BarChart3,
  Bell,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Hash,
  UserPen,
  Save,
  RefreshCw,
  XCircle,
} from "lucide-react";

const stepIcons = [FileText, Tags, Building2, UserPen, UserCheck, Users, Hash, Upload, Save];

export function GuideContent() {
  const t = useTranslations("guide");

  const steps = [
    { title: t("creation.step1Title"), desc: t("creation.step1Desc") },
    { title: t("creation.step2Title"), desc: t("creation.step2Desc") },
    { title: t("creation.step3Title"), desc: t("creation.step3Desc") },
    { title: t("creation.step4Title"), desc: t("creation.step4Desc") },
    { title: t("creation.step5Title"), desc: t("creation.step5Desc") },
    { title: t("creation.step6Title"), desc: t("creation.step6Desc") },
    { title: t("creation.step7Title"), desc: t("creation.step7Desc") },
    { title: t("creation.step8Title"), desc: t("creation.step8Desc") },
    { title: t("creation.step9Title"), desc: t("creation.step9Desc") },
  ];

  const lifecycleSteps = [
    { key: "draft", color: "bg-gray-100 text-gray-700 border-gray-200" },
    { key: "pendingApproval", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { key: "preparerApproved", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
    { key: "approved", color: "bg-green-50 text-green-700 border-green-200" },
    { key: "published", color: "bg-primary/10 text-primary border-primary/20" },
    { key: "preparerRejected", color: "bg-red-50 text-red-700 border-red-200" },
    { key: "approverRejected", color: "bg-red-50 text-red-700 border-red-200" },
    { key: "cancelled", color: "bg-red-50 text-red-700 border-red-200" },
  ];

  const statusLabels = useTranslations("documents.status");

  const afterPublishItems = [
    { key: "notifications", icon: Mail, color: "text-blue-600" },
    { key: "readTasks", icon: BookOpenCheck, color: "text-green-600" },
    { key: "tracking", icon: BarChart3, color: "text-purple-600" },
    { key: "reminders", icon: Bell, color: "text-amber-600" },
    { key: "escalation", icon: AlertTriangle, color: "text-red-600" },
  ];

  const revisionItems = [
    { key: "draftOverwrite", icon: Save, color: "text-gray-600" },
    { key: "newRevision", icon: RefreshCw, color: "text-blue-600" },
    { key: "rejectedRevision", icon: XCircle, color: "text-red-600" },
    { key: "revisionNumber", icon: Hash, color: "text-purple-600" },
  ];

  const tips = [
    t("tips.tip1"),
    t("tips.tip2"),
    t("tips.tip3"),
    t("tips.tip4"),
    t("tips.tip5"),
    t("tips.tip6"),
  ];

  return (
    <div className="space-y-10">
      {/* Section 1: Document Creation Steps */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("creation.title")}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {steps.map((step, idx) => {
            const Icon = stepIcons[idx];
            return (
              <Card key={idx} className="relative overflow-hidden">
                <div className="absolute left-0 top-0 flex size-8 items-center justify-center rounded-br-lg bg-primary text-xs font-bold text-primary-foreground">
                  {idx + 1}
                </div>
                <CardHeader className="pb-2 pl-12 pt-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="size-4 text-muted-foreground" />
                    {step.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pl-12 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section 2: Approval Workflow */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{t("approval.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("approval.subtitle")}</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Two-person flow */}
            <div>
              <p className="text-sm font-medium mb-3">{t("approval.twoPerson")}</p>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {["draft", "pendingApproval", "preparerApproved", "approved", "published"].map((key, idx) => (
                  <div key={key} className="flex items-center gap-2">
                    <Badge variant="outline" className={`${lifecycleSteps.find(s => s.key === key)?.color} px-3 py-1.5 text-xs font-medium`}>
                      {statusLabels(key)}
                    </Badge>
                    {idx < 4 && <ArrowRight className="size-4 text-muted-foreground hidden sm:block" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Same-person flow */}
            <div>
              <p className="text-sm font-medium mb-3">{t("approval.samePerson")}</p>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {["draft", "pendingApproval", "approved", "published"].map((key, idx) => (
                  <div key={key} className="flex items-center gap-2">
                    <Badge variant="outline" className={`${lifecycleSteps.find(s => s.key === key)?.color} px-3 py-1.5 text-xs font-medium`}>
                      {statusLabels(key)}
                    </Badge>
                    {idx < 3 && <ArrowRight className="size-4 text-muted-foreground hidden sm:block" />}
                  </div>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("approval.samePersonNote")}</p>
            </div>

            {/* Rejection flow */}
            <div>
              <p className="text-sm font-medium mb-3">{t("approval.rejection")}</p>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-3 py-1.5 text-xs font-medium">
                  {statusLabels("pendingApproval")}
                </Badge>
                <ArrowRight className="size-4 text-muted-foreground hidden sm:block" />
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 px-3 py-1.5 text-xs font-medium">
                  {statusLabels("preparerRejected")} / {statusLabels("approverRejected")}
                </Badge>
                <ArrowRight className="size-4 text-muted-foreground hidden sm:block" />
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1.5 text-xs font-medium">
                  {t("approval.newRevisionRequired")}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("approval.rejectionNote")}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section 3: Document Lifecycle */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{t("lifecycle.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("lifecycle.subtitle")}</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {lifecycleSteps.map((step) => (
                <div key={step.key} className="flex gap-3">
                  <Badge variant="outline" className={`${step.color} h-fit shrink-0 px-2 py-1 text-xs font-medium`}>
                    {statusLabels(step.key)}
                  </Badge>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`lifecycle.${step.key}`)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section 4: Revision System */}
      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <RefreshCw className="size-5 text-blue-500" />
            {t("revision.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("revision.subtitle")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {revisionItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.key}>
                <CardContent className="flex gap-3 p-4">
                  <div className={`mt-0.5 ${item.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t(`revision.${item.key}Title`)}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(`revision.${item.key}Desc`)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section 5: After Publishing */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("afterPublish.title")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {afterPublishItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.key}>
                <CardContent className="flex gap-3 p-4">
                  <div className={`mt-0.5 ${item.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(`afterPublish.${item.key}`)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section 6: Tips */}
      <section className="space-y-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Lightbulb className="size-5 text-amber-500" />
          {t("tips.title")}
        </h2>
        <Card>
          <CardContent className="p-4">
            <ul className="space-y-3">
              {tips.map((tip, idx) => (
                <li key={idx} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
                  <span className="text-sm text-muted-foreground leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
