import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout, colors } from "./layout";
import { emailStrings, type EmailLocale } from "../translations";

interface CarRejectedEmailProps {
  recipientName: string;
  carCode: string;
  rejectedByName: string;
  rejectionComment: string;
  link: string;
  locale?: EmailLocale;
}

export function CarRejectedEmail({
  recipientName,
  carCode,
  rejectedByName,
  rejectionComment,
  link,
  locale = "tr",
}: CarRejectedEmailProps) {
  const t = emailStrings[locale].carRejected;
  const tc = emailStrings[locale].common;

  return (
    <EmailLayout preview={t.preview.replace("{carCode}", carCode)} locale={locale}>
      <Heading style={heading}>{t.heading}</Heading>
      <Text style={text}>{tc.greeting.replace("{name}", recipientName)}</Text>
      <Text style={text}>
        {t.body
          .replace("{carCode}", carCode)
          .replace("{rejectedByName}", rejectedByName)}
      </Text>
      <Section style={rejectionBox}>
        <Text style={rejectionLabel}>{t.rejectionCommentLabel}</Text>
        <Text style={rejectionText}>{rejectionComment}</Text>
      </Section>
      <Section style={buttonContainer}>
        <Button style={button} href={link}>
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

const rejectionBox = {
  backgroundColor: "#FEF2F2",
  borderLeft: `4px solid ${colors.danger}`,
  borderRadius: "4px",
  margin: "16px 0",
  padding: "12px 16px",
};

const rejectionLabel = {
  color: colors.danger,
  fontSize: "12px",
  fontWeight: "600" as const,
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
};

const rejectionText = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};

const buttonContainer = {
  margin: "24px 0 0",
  textAlign: "center" as const,
};

const button = {
  backgroundColor: colors.accent,
  borderRadius: "6px",
  color: "#FFFFFF",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "600" as const,
  padding: "12px 24px",
  textDecoration: "none",
};
