import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout, colors } from "./layout";
import { emailStrings, type EmailLocale } from "../translations";

interface CarReminderEmailProps {
  assigneeName: string;
  carCode: string;
  daysUntilDeadline: number;
  targetDate: string;
  link: string;
  locale?: EmailLocale;
}

export function CarReminderEmail({
  assigneeName,
  carCode,
  daysUntilDeadline,
  targetDate,
  link,
  locale = "tr",
}: CarReminderEmailProps) {
  const t = emailStrings[locale].carReminder;
  const tc = emailStrings[locale].common;

  return (
    <EmailLayout preview={t.preview.replace("{carCode}", carCode)} locale={locale}>
      <Heading style={heading}>{t.heading}</Heading>
      <Text style={text}>{tc.greeting.replace("{name}", assigneeName)}</Text>
      <Text style={text}>
        {t.body
          .replace("{carCode}", carCode)
          .replace("{daysUntilDeadline}", String(daysUntilDeadline))
          .replace("{targetDate}", targetDate)}
      </Text>
      <Section style={warningBox}>
        <Text style={warningText}>{t.warning}</Text>
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

const warningBox = {
  backgroundColor: "#FFFBEB",
  borderLeft: `4px solid #F59E0B`,
  borderRadius: "4px",
  margin: "16px 0",
  padding: "12px 16px",
};

const warningText = {
  color: "#92400E",
  fontSize: "14px",
  fontWeight: "500" as const,
  lineHeight: "20px",
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
