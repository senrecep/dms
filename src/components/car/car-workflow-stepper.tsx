"use client";

import { Fragment } from "react";
import {
  CAR_STATUS_ORDER,
  getStatusIndex,
  isTerminalStatus,
} from "@/lib/car/workflow";
import { useTranslations } from "next-intl";
import { Check, Circle, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./car-workflow-stepper.module.css";

type CarWorkflowStepperProps = {
  currentStatus: string;
};

export function CarWorkflowStepper({ currentStatus }: CarWorkflowStepperProps) {
  const t = useTranslations("car.status");
  const currentIndex = getStatusIndex(currentStatus);
  const isCancelled = currentStatus === "CANCELLED";

  return (
    <div className="w-full">
      {/* Desktop stepper */}
      <div className={styles.desktop}>
        <div className="flex items-start">
          {CAR_STATUS_ORDER.map((status, index) => {
            const isCompleted = currentIndex > index;
            const isCurrent = currentIndex === index && !isCancelled;
            const isPending = currentIndex < index || isCancelled;

            return (
              <Fragment key={status}>
                {/* Step: circle + label */}
                <div className="flex flex-col items-center shrink-0 gap-1.5">
                  <div
                    className={cn(
                      "flex items-center justify-center size-8 rounded-full border-2 transition-colors",
                      isCompleted &&
                        "bg-green-600 border-green-600 text-white",
                      isCurrent &&
                        "bg-primary border-primary text-primary-foreground",
                      isPending &&
                        "bg-muted border-muted-foreground/30 text-muted-foreground",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="size-4" />
                    ) : (
                      <span className="text-xs font-semibold">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] leading-tight text-center font-medium w-20",
                      isCompleted && "text-green-600",
                      isCurrent && "text-primary font-semibold",
                      isPending && "text-muted-foreground",
                    )}
                  >
                    {t(status)}
                  </span>
                </div>
                {/* Connecting line */}
                {index < CAR_STATUS_ORDER.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-[2px] mt-[15px] mx-1",
                      currentIndex > index
                        ? "bg-green-600"
                        : "bg-muted-foreground/30",
                    )}
                  />
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Mobile stepper */}
      <div className={styles.mobile}>
        <div className="flex flex-col gap-2">
          {CAR_STATUS_ORDER.map((status, index) => {
            const isCompleted = currentIndex > index;
            const isCurrent = currentIndex === index && !isCancelled;
            const isPending = currentIndex < index || isCancelled;

            return (
              <div key={status} className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex items-center justify-center size-7 aspect-square rounded-full border-2 shrink-0 transition-colors",
                    isCompleted &&
                      "bg-green-600 border-green-600 text-white",
                    isCurrent &&
                      "bg-primary border-primary text-primary-foreground",
                    isPending &&
                      "bg-muted border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-3.5" />
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCompleted && "text-green-600",
                    isCurrent && "text-primary font-semibold",
                    isPending && "text-muted-foreground",
                  )}
                >
                  {t(status)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancelled overlay */}
      {isCancelled && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
          <Ban className="w-4 h-4" />
          <span className="text-sm font-medium">{t("CANCELLED")}</span>
        </div>
      )}
    </div>
  );
}
