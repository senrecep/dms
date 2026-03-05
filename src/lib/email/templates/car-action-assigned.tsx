import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout, colors } from "./layout";
import { emailStrings, type EmailLocale } from "../translations";

interface CarActionAssignedEmailProps {
  assigneeName: string;
  carCode: string;
  actionDescription: string;
  targetDate: string;
  link: string;
  locale?: EmailLocale;
}

export function CarActionAssignedEmail({
  assigneeName,
  carCode,
  actionDescription,
  targetDate,
  link,
  locale = "tr",
}: CarActionAssignedEmailProps) {
  const t = emailStrings[locale].carActionAssigned;
  const tc = emailStrings[locale].common;

  return (
    <EmailLayout preview={t.preview.replace("{carCode}", carCode)} locale={locale}>
      <Heading style={heading}>{t.heading}</Heading>
      <Text style={text}>{tc.greeting.replace("{name}", assigneeName)}</Text>
      <Text style={text}>
        {t.body.replace("{carCode}", carCode)}
      </Text>
      <Section style={infoBox}>
        <Text style={descriptionText}>{actionDescription}</Text>
      </Section>
      <Section style={dateBox}>
        <Text style={dateLabel}>{targetDate}</Text>
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
  backgroundColor: "#F9FAFB",
  borderLeft: `4px solid ${colors.accent}`,
  borderRadius: "4px",
  margin: "16px 0",
  padding: "12px 16px",
};

const descriptionText = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};

const dateBox = {
  backgroundColor: "#F0F9FF",
  borderRadius: "4px",
  margin: "8px 0 16px",
  padding: "8px 16px",
};

const dateLabel = {
  color: colors.accent,
  fontSize: "13px",
  fontWeight: "600" as const,
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
