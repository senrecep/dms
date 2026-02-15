import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout, colors } from "./layout";
import { emailStrings, type EmailLocale } from "../translations";

interface ApprovalRequestEmailProps {
  approverName: string;
  documentTitle: string;
  documentCode: string;
  uploaderName: string;
  approvalUrl: string;
  approvalStep?: "preparer" | "approver";
  locale?: EmailLocale;
}

export function ApprovalRequestEmail({
  approverName,
  documentTitle,
  documentCode,
  uploaderName,
  approvalUrl,
  approvalStep = "preparer",
  locale = "tr",
}: ApprovalRequestEmailProps) {
  const t = emailStrings[locale].approvalRequest;
  const tc = emailStrings[locale].common;

  // Select appropriate text based on approval step
  const bodyText = approvalStep === "preparer"
    ? t.preparerBody
    : t.approverBody;

  return (
    <EmailLayout preview={t.preview.replace("{title}", documentTitle)} locale={locale}>
      <Heading style={heading}>{t.heading}</Heading>
      <Text style={text}>{tc.greeting.replace("{name}", approverName)}</Text>
      <Text style={text}>
        {bodyText
          .replace("{uploaderName}", uploaderName)
          .replace("{documentTitle}", documentTitle)}
      </Text>
      <Section style={infoBox}>
        <Text style={infoLabel}>{t.documentCodeLabel}</Text>
        <Text style={infoValue}>{documentCode}</Text>
      </Section>
      <Section style={buttonContainer}>
        <Button style={button} href={approvalUrl}>
          {t.button}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const heading = {
  color: colors.primary,
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

const infoBox = {
  backgroundColor: "#F3F4F6",
  borderRadius: "6px",
  padding: "12px 16px",
  margin: "16px 0",
};

const infoLabel = {
  color: colors.muted,
  fontSize: "12px",
  fontWeight: "600" as const,
  margin: "0 0 4px",
};

const infoValue = {
  color: "#374151",
  fontSize: "14px",
  fontWeight: "600" as const,
  margin: "0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0 0",
};

const button = {
  backgroundColor: colors.accent,
  borderRadius: "6px",
  color: "#FFFFFF",
  fontSize: "14px",
  fontWeight: "600" as const,
  padding: "12px 24px",
  textDecoration: "none",
};

export default ApprovalRequestEmail;
