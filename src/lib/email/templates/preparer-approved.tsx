import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout, colors } from "./layout";
import { emailStrings, type EmailLocale } from "../translations";

interface PreparerApprovedEmailProps {
  approverName: string;
  preparerName: string;
  documentTitle: string;
  documentCode: string;
  actionUrl: string;
  locale?: EmailLocale;
}

export function PreparerApprovedEmail({
  approverName,
  preparerName,
  documentTitle,
  documentCode,
  actionUrl,
  locale = "tr",
}: PreparerApprovedEmailProps) {
  const t = emailStrings[locale].preparerApproved;
  const tc = emailStrings[locale].common;

  return (
    <EmailLayout preview={t.preview.replace("{title}", documentTitle)} locale={locale}>
      <Heading style={heading}>{t.heading}</Heading>
      <Text style={text}>{tc.greeting.replace("{name}", approverName)}</Text>
      <Text style={text}>
        {t.body
          .replace("{preparerName}", preparerName)
          .replace("{documentTitle}", documentTitle)
          .replace("{documentCode}", documentCode)}
      </Text>
      <Section style={infoBox}>
        <Text style={infoLabel}>{t.documentCodeLabel}</Text>
        <Text style={infoValue}>{documentCode}</Text>
      </Section>
      <Section style={buttonContainer}>
        <Button style={button} href={actionUrl}>
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

export default PreparerApprovedEmail;
