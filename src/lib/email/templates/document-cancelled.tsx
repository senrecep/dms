import { Heading, Text, Section } from "@react-email/components";
import { EmailLayout, colors } from "./layout";
import { emailStrings, type EmailLocale } from "../translations";

interface DocumentCancelledEmailProps {
  recipientName: string;
  documentTitle: string;
  documentCode: string;
  cancelledBy: string;
  locale?: EmailLocale;
}

export function DocumentCancelledEmail({
  recipientName,
  documentTitle,
  documentCode,
  cancelledBy,
  locale = "tr",
}: DocumentCancelledEmailProps) {
  const t = emailStrings[locale].documentCancelled;
  const tc = emailStrings[locale].common;

  return (
    <EmailLayout preview={t.preview.replace("{title}", documentTitle)} locale={locale}>
      <Heading style={heading}>{t.heading}</Heading>
      <Text style={text}>{tc.greeting.replace("{name}", recipientName)}</Text>
      <Text style={text}>
        {t.body
          .replace("{documentTitle}", documentTitle)
          .replace("{documentCode}", documentCode)
          .replace("{cancelledBy}", cancelledBy)}
      </Text>
      <Section style={warningBox}>
        <Text style={warningText}>{t.warning}</Text>
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

const warningBox = {
  backgroundColor: "#FEF2F2",
  borderLeft: `4px solid ${colors.danger}`,
  borderRadius: "0 6px 6px 0",
  padding: "12px 16px",
  margin: "16px 0",
};

const warningText = {
  color: colors.danger,
  fontSize: "14px",
  fontWeight: "600" as const,
  margin: "0",
};

export default DocumentCancelledEmail;
