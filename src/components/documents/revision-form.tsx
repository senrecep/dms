"use client";

import { useRef, useState } from "react";
import { reviseDocument } from "@/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, FileText, X } from "lucide-react";

type RevisionFormProps = {
  documentId: string;
  currentRevisionNo: number;
};

export function RevisionForm({ documentId, currentRevisionNo }: RevisionFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [changes, setChanges] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error(t("documents.toast.fileRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("documentId", documentId);
      formData.set("file", file);
      if (changes) formData.set("changes", changes);

      const result = await reviseDocument(formData);
      toast.success(t("documents.toast.revisionCreated", { revNo: result.revisionNo }));
      router.push(`/documents/${documentId}`);
    } catch {
      toast.error(t("documents.toast.revisionFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border p-4">
        <p className="text-sm">
          {t("documents.detail.currentRevision")}: <span className="font-medium">Rev.{String(currentRevisionNo).padStart(2, "0")}</span>
        </p>
        <p className="text-muted-foreground text-sm">
          {t("documents.detail.newRevision")}: <span className="font-medium">Rev.{String(currentRevisionNo + 1).padStart(2, "0")}</span>
        </p>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("documents.form.uploadFile")}</label>
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {file ? (
            <div className="flex items-center gap-2">
              <FileText className="text-primary size-6" />
              <span className="text-sm font-medium">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="size-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="text-muted-foreground mb-2 size-8" />
              <p className="text-muted-foreground text-sm">{t("documents.upload.dragDrop")}</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) setFile(e.target.files[0]);
            }}
          />
        </div>
      </div>

      {/* Revision Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("documents.form.revisionNotes")}</label>
        <Input
          value={changes}
          onChange={(e) => setChanges(e.target.value)}
          placeholder={t("documents.detail.revisionChangesPlaceholder")}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {t("common.actions.cancel")}
        </Button>
        <Button type="submit" disabled={isSubmitting || !file}>
          {isSubmitting ? t("documents.upload.uploading") : t("common.actions.submit")}
        </Button>
      </div>
    </form>
  );
}
