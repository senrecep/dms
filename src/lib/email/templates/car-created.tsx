import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout, colors } from "./layout";
import { emailStrings, type EmailLocale } from "../translations";

interface CarCreatedEmailProps {
  assigneeName: string;
  carCode: string;
  nonconformityDescription: string;
  requesterName: string;
  targetDate: string;
  link: string;
  locale?: EmailLocale;
}

export function CarCreatedEmail({
  assigneeName,
  carCode,
  nonconformityDescription,
  requesterName,
  targetDate,
  link,
  locale = "tr",
}: CarCreatedEmailProps) {
  const t = emailStrings[locale].carCreated;
  const tc = emailStrings[locale].common;

  return (
    <EmailLayout preview={t.preview.replace("{carCode}", carCode)} locale={locale}>
      <Heading style={heading}>{t.heading}</Heading>
      <Text style={text}>{tc.greeting.replace("{name}", assigneeName)}</Text>
      <Text style={text}>
        {t.body
          .replace("{carCode}", carCode)
          .replace("{requesterName}", requesterName)
          .replace("{targetDate}", targetDate)}
      </Text>
      <Section style={infoBox}>
        <Text style={infoLabel}>{t.targetDateLabel}</Text>
        <Text style={infoValue}>{targetDate}</Text>
      </Section>
      <Section style={descriptionBox}>
        <Text style={descriptionText}>{nonconformityDescription}</Text>
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
  backgroundColor: "#F0F9FF",
  borderLeft: `4px solid ${colors.accent}`,
  borderRadius: "4px",
  margin: "16px 0",
  padding: "12px 16px",
};

const infoLabel = {
  color: colors.muted,
  fontSize: "12px",
  fontWeight: "600" as const,
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
};

const infoValue = {
  color: colors.primary,
  fontSize: "16px",
  fontWeight: "600" as const,
  margin: "0",
};

const descriptionBox = {
  backgroundColor: "#F9FAFB",
  borderLeft: `4px solid ${colors.muted}`,
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

// Export colors from layout for reference
export { colors };
