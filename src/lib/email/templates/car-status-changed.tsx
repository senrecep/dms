import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout, colors } from "./layout";
import { emailStrings, type EmailLocale } from "../translations";

interface CarStatusChangedEmailProps {
  recipientName: string;
  carCode: string;
  oldStatus: string;
  newStatus: string;
  changedByName: string;
  link: string;
  locale?: EmailLocale;
}

export function CarStatusChangedEmail({
  recipientName,
  carCode,
  oldStatus,
  newStatus,
  changedByName,
  link,
  locale = "tr",
}: CarStatusChangedEmailProps) {
  const t = emailStrings[locale].carStatusChanged;
  const tc = emailStrings[locale].common;

  return (
    <EmailLayout preview={t.preview.replace("{carCode}", carCode)} locale={locale}>
      <Heading style={heading}>{t.heading}</Heading>
      <Text style={text}>{tc.greeting.replace("{name}", recipientName)}</Text>
      <Text style={text}>
        {t.body
          .replace("{carCode}", carCode)
          .replace("{changedByName}", changedByName)}
      </Text>
      <Section style={statusContainer}>
        <Section style={statusBox}>
          <Text style={statusLabel}>{t.oldStatusLabel}</Text>
          <Text style={statusValueOld}>{oldStatus}</Text>
        </Section>
        <Text style={arrow}>→</Text>
        <Section style={statusBox}>
          <Text style={statusLabel}>{t.newStatusLabel}</Text>
          <Text style={statusValueNew}>{newStatus}</Text>
        </Section>
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

const statusContainer = {
  display: "flex" as const,
  margin: "16px 0",
  gap: "8px",
};

const statusBox = {
  backgroundColor: "#F9FAFB",
  borderRadius: "6px",
  display: "inline-block" as const,
  margin: "0 8px 0 0",
  padding: "12px 16px",
  width: "40%",
};

const statusLabel = {
  color: colors.muted,
  fontSize: "11px",
  fontWeight: "600" as const,
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
};

const statusValueOld = {
  color: "#6B7280",
  fontSize: "14px",
  fontWeight: "600" as const,
  margin: "0",
};

const statusValueNew = {
  color: colors.accent,
  fontSize: "14px",
  fontWeight: "600" as const,
  margin: "0",
};

const arrow = {
  color: colors.muted,
  display: "inline-block" as const,
  fontSize: "20px",
  margin: "12px 8px 0",
  verticalAlign: "middle" as const,
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
