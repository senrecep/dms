import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout, colors } from "./layout";
import { emailStrings, type EmailLocale } from "../translations";

interface DocumentRevisedEmailProps {
  recipientName: string;
  documentTitle: string;
  documentCode: string;
  revisedBy: string;
  revisionNotes?: string;
  documentUrl: string;
  locale?: EmailLocale;
}

export function DocumentRevisedEmail({
  recipientName,
  documentTitle,
  documentCode,
  revisedBy,
  revisionNotes,
  documentUrl,
  locale = "tr",
}: DocumentRevisedEmailProps) {
  const t = emailStrings[locale].documentRevised;
  const tc = emailStrings[locale].common;

  return (
    <EmailLayout preview={t.preview.replace("{title}", documentTitle)} locale={locale}>
      <Heading style={heading}>{t.heading}</Heading>
      <Text style={text}>{tc.greeting.replace("{name}", recipientName)}</Text>
      <Text style={text}>
        {t.body
          .replace("{documentTitle}", documentTitle)
          .replace("{documentCode}", documentCode)
          .replace("{revisedBy}", revisedBy)}
      </Text>
      {revisionNotes && (
        <Section style={notesBox}>
          <Text style={notesLabel}>{t.notesLabel}</Text>
          <Text style={notesText}>{revisionNotes}</Text>
        </Section>
      )}
      <Section style={infoBox}>
        <Text style={infoText}>{t.info}</Text>
      </Section>
      <Section style={buttonContainer}>
        <Button style={button} href={documentUrl}>
          {t.button}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const heading = {
  color: colors.accent,
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

const notesBox = {
  backgroundColor: "#F3F4F6",
  borderRadius: "6px",
  padding: "12px 16px",
  margin: "16px 0",
};

const notesLabel = {
  color: colors.muted,
  fontSize: "12px",
  fontWeight: "600" as const,
  margin: "0 0 4px",
};

const notesText = {
  color: "#374151",
  fontSize: "14px",
  margin: "0",
};

const infoBox = {
  backgroundColor: "#EFF6FF",
  borderLeft: `4px solid ${colors.accent}`,
  borderRadius: "0 6px 6px 0",
  padding: "12px 16px",
  margin: "16px 0",
};

const infoText = {
  color: "#1E40AF",
  fontSize: "14px",
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

export default DocumentRevisedEmail;
