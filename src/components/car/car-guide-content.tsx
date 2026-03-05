"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Hash,
  AlertCircle,
  Settings2,
  Building2,
  UserCheck,
  FileText,
  CalendarDays,
  Bell,
  Paperclip,
  Send,
  ArrowRight,
  PlusCircle,
  Users,
  BarChart3,
  DollarSign,
  ShieldCheck,
  MessageSquare,
  RotateCcw,
  CheckCircle2,
  UserPen,
  UserCog,
  Clock,
  Lightbulb,
} from "lucide-react";

const stepIcons = [Hash, AlertCircle, Settings2, Building2, Building2, UserCheck, FileText, CalendarDays, Bell, Paperclip, Send];

const workflowStatuses = [
  { key: "OPEN", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "ROOT_CAUSE_ANALYSIS", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "IMMEDIATE_ACTION", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "PLANNED_ACTION", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { key: "ACTION_RESULTS", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { key: "PENDING_CLOSURE", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "CLOSED", color: "bg-green-50 text-green-700 border-green-200" },
  { key: "CANCELLED", color: "bg-gray-100 text-gray-700 border-gray-200" },
];

export function CarGuideContent() {
  const t = useTranslations("carGuide");
  const statusLabels = useTranslations("car.status");

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
    { title: t("creation.step10Title"), desc: t("creation.step10Desc") }
  ];

  const correctiveActionItems = [
    { key: "creating", icon: PlusCircle, color: "text-blue-600" },
    { key: "teamAssignment", icon: Users, color: "text-purple-600" },
    { key: "statusTracking", icon: BarChart3, color: "text-green-600" },
    { key: "costTracking", icon: DollarSign, color: "text-amber-600" },
  ];

  const closureItems = [
    { key: "whoCanClose", icon: ShieldCheck, color: "text-blue-600" },
    { key: "closureComment", icon: MessageSquare, color: "text-green-600" },
    { key: "rejection", icon: RotateCcw, color: "text-red-600" },
    { key: "afterClosure", icon: CheckCircle2, color: "text-purple-600" },
  ];

  const roleItems = [
    { key: "requester", icon: UserPen, color: "text-blue-600" },
    { key: "assignee", icon: UserCog, color: "text-green-600" },
    { key: "qaReviewer", icon: ShieldCheck, color: "text-purple-600" },
    { key: "notifications", icon: Bell, color: "text-amber-600" },
    { key: "reminders", icon: Clock, color: "text-red-600" },
  ];

  const tips = [
    t("tips.tip1"),
    t("tips.tip2"),
    t("tips.tip3"),
    t("tips.tip4"),
    t("tips.tip5"),
    t("tips.tip6"),
    t("tips.tip7"),
    t("tips.tip8"),
  ];

  const normalFlowStatuses = ["OPEN", "ROOT_CAUSE_ANALYSIS", "IMMEDIATE_ACTION", "PLANNED_ACTION", "ACTION_RESULTS", "PENDING_CLOSURE", "CLOSED"];

  return (
    <div className="space-y-10">
      {/* Section 1: Creating a CAR */}
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

      {/* Section 2: Workflow Stages */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{t("workflow.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("workflow.subtitle")}</p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Normal flow */}
            <div>
              <p className="text-sm font-medium mb-3">{t("workflow.normalFlow")}</p>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {normalFlowStatuses.map((key, idx) => (
                  <div key={key} className="flex items-center gap-2">
                    <Badge variant="outline" className={`${workflowStatuses.find(s => s.key === key)?.color} px-3 py-1.5 text-xs font-medium`}>
                      {statusLabels(key)}
                    </Badge>
                    {idx < normalFlowStatuses.length - 1 && <ArrowRight className="size-4 text-muted-foreground" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Rejection flow */}
            <div>
              <p className="text-sm font-medium mb-3">{t("workflow.rejectionFlow")}</p>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 px-3 py-1.5 text-xs font-medium">
                  {statusLabels("PENDING_CLOSURE")}
                </Badge>
                <ArrowRight className="size-4 text-muted-foreground" />
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 px-3 py-1.5 text-xs font-medium">
                  {statusLabels("ACTION_RESULTS")}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("workflow.rejectionNote")}</p>
            </div>

            {/* Cancellation flow */}
            <div>
              <p className="text-sm font-medium mb-3">{t("workflow.cancellationFlow")}</p>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1.5 text-xs font-medium">
                  {t("workflow.anyActiveStatus")}
                </Badge>
                <ArrowRight className="size-4 text-muted-foreground" />
                                <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200 px-3 py-1.5 text-xs font-medium">
                  {statusLabels("CANCELLED")}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("workflow.cancellationNote")}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section 3: Status Lifecycle */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{t("lifecycle.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("lifecycle.subtitle")}</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {workflowStatuses.map((step) => (
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

      {/* Section 4: Corrective Actions Management */}
      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <PlusCircle className="size-5 text-blue-500" />
            {t("correctiveActions.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("correctiveActions.subtitle")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {correctiveActionItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.key}>
                <CardContent className="flex gap-3 p-4">
                  <div className={`mt-0.5 ${item.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t(`correctiveActions.${item.key}Title`)}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(`correctiveActions.${item.key}Desc`)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section 5: Closure Process */}
      <section className="space-y-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <ShieldCheck className="size-5 text-green-500" />
            {t("closure.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("closure.subtitle")}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {closureItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.key}>
                <CardContent className="flex gap-3 p-4">
                  <div className={`mt-0.5 ${item.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t(`closure.${item.key}Title`)}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(`closure.${item.key}Desc`)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section 6: Roles & Notifications */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("roles.title")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roleItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.key}>
                <CardContent className="flex gap-3 p-4">
                  <div className={`mt-0.5 ${item.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t(`roles.${item.key}Title`)}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(`roles.${item.key}Desc`)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Section 7: Tips */}
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
