import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout, colors } from "./layout";
import { emailStrings, type EmailLocale } from "../translations";

interface CarClosedEmailProps {
  recipientName: string;
  carCode: string;
  closedByName: string;
  closingNote: string;
  link: string;
  locale?: EmailLocale;
}

export function CarClosedEmail({
  recipientName,
  carCode,
  closedByName,
  closingNote,
  link,
  locale = "tr",
}: CarClosedEmailProps) {
  const t = emailStrings[locale].carClosed;
  const tc = emailStrings[locale].common;

  return (
    <EmailLayout preview={t.preview.replace("{carCode}", carCode)} locale={locale}>
      <Heading style={heading}>{t.heading}</Heading>
      <Text style={text}>{tc.greeting.replace("{name}", recipientName)}</Text>
      <Text style={text}>
        {t.body
          .replace("{carCode}", carCode)
          .replace("{closedByName}", closedByName)}
      </Text>
      {closingNote && (
        <Section style={noteBox}>
          <Text style={noteLabel}>{t.closingNoteLabel}</Text>
          <Text style={noteText}>{closingNote}</Text>
        </Section>
      )}
      <Section style={buttonContainer}>
        <Button style={button} href={link}>
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

const noteBox = {
  backgroundColor: "#F0FDF4",
  borderLeft: `4px solid ${colors.success}`,
  borderRadius: "4px",
  margin: "16px 0",
  padding: "12px 16px",
};

const noteLabel = {
  color: colors.muted,
  fontSize: "12px",
  fontWeight: "600" as const,
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
};

const noteText = {
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
  backgroundColor: colors.primary,
  borderRadius: "6px",
  color: "#FFFFFF",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "600" as const,
  padding: "12px 24px",
  textDecoration: "none",
};
