import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout, colors } from "./layout";
import { emailStrings, type EmailLocale } from "../translations";

interface DocumentRejectedEmailProps {
  uploaderName: string;
  documentTitle: string;
  documentCode: string;
  rejectedBy: string;
  rejectionReason: string;
  editUrl: string;
  rejectedByRole?: "preparer" | "approver";
  locale?: EmailLocale;
}

export function DocumentRejectedEmail({
  uploaderName,
  documentTitle,
  documentCode,
  rejectedBy,
  rejectionReason,
  editUrl,
  rejectedByRole,
  locale = "tr",
}: DocumentRejectedEmailProps) {
  const t = emailStrings[locale].documentRejected;
  const tc = emailStrings[locale].common;

  // Build rejection context if role is specified
  const roleContext = rejectedByRole
    ? ` (${rejectedByRole === "preparer" ? t.rejectedByPreparer : t.rejectedByApprover})`
    : "";

  return (
    <EmailLayout preview={t.preview.replace("{title}", documentTitle)} locale={locale}>
      <Heading style={heading}>{t.heading}</Heading>
      <Text style={text}>{tc.greeting.replace("{name}", uploaderName)}</Text>
      <Text style={text}>
        {t.body
          .replace("{documentTitle}", documentTitle)
          .replace("{documentCode}", documentCode)
          .replace("{rejectedBy}", rejectedBy + roleContext)}
      </Text>
      <Section style={reasonBox}>
        <Text style={reasonLabel}>{t.reasonLabel}</Text>
        <Text style={reasonText}>{rejectionReason}</Text>
      </Section>
      <Text style={text}>{t.afterReason}</Text>
      <Section style={buttonContainer}>
        <Button style={button} href={editUrl}>
          {t.button}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const heading = {
  color: colors.danger,
  fontSize: "24px",
  fontWeight: "600" as const,
  margin: "0 0 16px",
};

const text = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0 0 12px",
};

const reasonBox = {
  backgroundColor: "#FEF2F2",
  borderLeft: `4px solid ${colors.danger}`,
  borderRadius: "0 6px 6px 0",
  padding: "12px 16px",
  margin: "16px 0",
};

const reasonLabel = {
  color: colors.danger,
  fontSize: "12px",
  fontWeight: "600" as const,
  margin: "0 0 4px",
};

const reasonText = {
  color: "#374151",
  fontSize: "14px",
  margin: "0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0 0",
};

const button = {
  backgroundColor: colors.primary,
  borderRadius: "6px",
  color: "#FFFFFF",
  fontSize: "14px",
  fontWeight: "600" as const,
  padding: "12px 24px",
  textDecoration: "none",
};

export default DocumentRejectedEmail;
