import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout, colors } from "./layout";
import { emailStrings, type EmailLocale } from "../translations";

interface DocumentApprovedEmailProps {
  uploaderName: string;
  documentTitle: string;
  documentCode: string;
  approvedBy: string;
  publishUrl: string;
  locale?: EmailLocale;
}

export function DocumentApprovedEmail({
  uploaderName,
  documentTitle,
  documentCode,
  approvedBy,
  publishUrl,
  locale = "tr",
}: DocumentApprovedEmailProps) {
  const t = emailStrings[locale].documentApproved;
  const tc = emailStrings[locale].common;

  return (
    <EmailLayout preview={t.preview.replace("{title}", documentTitle)} locale={locale}>
      <Heading style={heading}>{t.heading}</Heading>
      <Text style={text}>{tc.greeting.replace("{name}", uploaderName)}</Text>
      <Text style={text}>
        {t.body
          .replace("{documentTitle}", documentTitle)
          .replace("{documentCode}", documentCode)
          .replace("{approvedBy}", approvedBy)}
      </Text>
      <Section style={infoBox}>
        <Text style={infoText}>{t.info}</Text>
      </Section>
      <Section style={buttonContainer}>
        <Button style={button} href={publishUrl}>
          {t.button}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const heading = {
  color: colors.success,
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
  backgroundColor: "#F0FDF4",
  borderLeft: `4px solid ${colors.success}`,
  borderRadius: "0 6px 6px 0",
  padding: "12px 16px",
  margin: "16px 0",
};

const infoText = {
  color: "#15803D",
  fontSize: "14px",
  margin: "0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "24px 0 0",
};

const button = {
  backgroundColor: colors.success,
  borderRadius: "6px",
  color: "#FFFFFF",
  fontSize: "14px",
  fontWeight: "600" as const,
  padding: "12px 24px",
  textDecoration: "none",
};

export default DocumentApprovedEmail;
