import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout, colors } from "./layout";
import { emailStrings, type EmailLocale } from "../translations";

interface EscalationNoticeEmailProps {
  managerName: string;
  documentTitle: string;
  documentCode: string;
  originalApprover: string;
  daysPending: number;
  approvalUrl: string;
  locale?: EmailLocale;
}

export function EscalationNoticeEmail({
  managerName,
  documentTitle,
  documentCode,
  originalApprover,
  daysPending,
  approvalUrl,
  locale = "tr",
}: EscalationNoticeEmailProps) {
  const t = emailStrings[locale].escalationNotice;
  const tc = emailStrings[locale].common;

  return (
    <EmailLayout preview={t.preview.replace("{title}", documentTitle)} locale={locale}>
      <Heading style={heading}>{t.heading}</Heading>
      <Text style={text}>{tc.greeting.replace("{name}", managerName)}</Text>
      <Text style={text}>
        {t.body
          .replace("{documentTitle}", documentTitle)
          .replace("{documentCode}", documentCode)
          .replace(/\{originalApprover\}/g, originalApprover)
          .replace(/\{daysPending\}/g, String(daysPending))}
      </Text>
      <Section style={escalationBox}>
        <Text style={escalationLabel}>{t.reasonLabel}</Text>
        <Text style={escalationText}>
          {t.reasonText
            .replace("{originalApprover}", originalApprover)
            .replace(/\{daysPending\}/g, String(daysPending))}
        </Text>
      </Section>
      <Text style={text}>{t.afterReason}</Text>
      <Section style={buttonContainer}>
        <Button style={button} href={approvalUrl}>
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

const escalationBox = {
  backgroundColor: "#FEF2F2",
  borderLeft: `4px solid ${colors.danger}`,
  borderRadius: "0 6px 6px 0",
  padding: "12px 16px",
  margin: "16px 0",
};

const escalationLabel = {
  color: colors.danger,
  fontSize: "12px",
  fontWeight: "600" as const,
  margin: "0 0 4px",
};

const escalationText = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0 0",
};

const button = {
  backgroundColor: colors.danger,
  borderRadius: "6px",
  color: "#FFFFFF",
  fontSize: "14px",
  fontWeight: "600" as const,
  padding: "12px 24px",
  textDecoration: "none",
};

export default EscalationNoticeEmail;
