import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout, colors } from "./layout";
import { emailStrings, type EmailLocale } from "../translations";

interface ReadReminderEmailProps {
  userName: string;
  documentTitle: string;
  documentCode: string;
  daysPending: number;
  readUrl: string;
  locale?: EmailLocale;
}

export function ReadReminderEmail({
  userName,
  documentTitle,
  documentCode,
  daysPending,
  readUrl,
  locale = "tr",
}: ReadReminderEmailProps) {
  const t = emailStrings[locale].readReminder;
  const tc = emailStrings[locale].common;

  return (
    <EmailLayout preview={t.preview.replace("{title}", documentTitle)} locale={locale}>
      <Heading style={heading}>{t.heading}</Heading>
      <Text style={text}>{tc.greeting.replace("{name}", userName)}</Text>
      <Text style={text}>
        {t.body
          .replace("{documentTitle}", documentTitle)
          .replace("{documentCode}", documentCode)
          .replace("{daysPending}", String(daysPending))}
      </Text>
      <Section style={warningBox}>
        <Text style={warningText}>{t.warning}</Text>
      </Section>
      <Section style={buttonContainer}>
        <Button style={button} href={readUrl}>
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
  backgroundColor: "#FEF3C7",
  borderLeft: "4px solid #F59E0B",
  borderRadius: "0 6px 6px 0",
  padding: "12px 16px",
  margin: "16px 0",
};

const warningText = {
  color: "#92400E",
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

export default ReadReminderEmail;
