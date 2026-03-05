"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save, Edit2 } from "lucide-react";
import { saveImmediateAction } from "@/actions/car-immediate-action";

type ImmediateActionEntry = {
  id: string;
  description: string;
  createdAt: Date;
  createdBy: { id: string; name: string; email?: string } | null;
};

type CarImmediateActionSectionProps = {
  carId: string;
  carStatus: string;
  initialEntries: ImmediateActionEntry[];
  canEdit: boolean;
};

const EDITABLE_STATUSES = [
  "IMMEDIATE_ACTION",
  "PLANNED_ACTION",
  "ACTION_RESULTS",
  "PENDING_CLOSURE",
];

export function CarImmediateActionSection({
  carId,
  carStatus,
  initialEntries,
  canEdit,
}: CarImmediateActionSectionProps) {
  const t = useTranslations("car");
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(initialEntries.length === 0);
  const [description, setDescription] = useState(
    initialEntries[0]?.description ?? "",
  );

  const isEditable = canEdit && EDITABLE_STATUSES.includes(carStatus);
  const hasExisting = initialEntries.length > 0;

  function handleSave() {
    if (!description.trim()) return;
    startTransition(async () => {
      const result = await saveImmediateAction(carId, description);
      if (result.success) {
        toast.success(t("saveImmediateAction"));
        setIsEditing(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {t("addImmediateAction")}
          </CardTitle>
          {isEditable && hasExisting && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-3.5 w-3.5 mr-1.5" />
              {t("editImmediateAction")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing && isEditable ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="immediate-action-description">
                {t("actionDescription")}
              </Label>
              <Textarea
                id="immediate-action-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("addImmediateAction")}
                rows={5}
                className="resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isPending || !description.trim()}
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {isPending ? t("submitting") : t("saveImmediateAction")}
              </Button>
              {hasExisting && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDescription(initialEntries[0]?.description ?? "");
                    setIsEditing(false);
                  }}
                  disabled={isPending}
                >
                  {t("cancel")}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div>
            {hasExisting ? (
              <div className="space-y-2">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {initialEntries[0].description}
                </p>
                {initialEntries[0].createdBy && (
                  <>
                    <Separator />
                    <p className="text-xs text-muted-foreground">
                      {initialEntries[0].createdBy.name}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {t("noImmediateAction")}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
