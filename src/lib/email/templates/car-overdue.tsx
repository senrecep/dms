import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout, colors } from "./layout";
import { emailStrings, type EmailLocale } from "../translations";

interface CarOverdueEmailProps {
  assigneeName: string;
  carCode: string;
  daysOverdue: number;
  targetDate: string;
  link: string;
  locale?: EmailLocale;
}

export function CarOverdueEmail({
  assigneeName,
  carCode,
  daysOverdue,
  targetDate,
  link,
  locale = "tr",
}: CarOverdueEmailProps) {
  const t = emailStrings[locale].carOverdue;
  const tc = emailStrings[locale].common;

  return (
    <EmailLayout preview={t.preview.replace("{carCode}", carCode)} locale={locale}>
      <Heading style={heading}>{t.heading}</Heading>
      <Text style={text}>{tc.greeting.replace("{name}", assigneeName)}</Text>
      <Text style={text}>
        {t.body
          .replace("{carCode}", carCode)
          .replace("{daysOverdue}", String(daysOverdue))
          .replace("{targetDate}", targetDate)}
      </Text>
      <Section style={overdueBox}>
        <Text style={overdueText}>{t.warning}</Text>
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

const overdueBox = {
  backgroundColor: "#FEF2F2",
  borderLeft: `4px solid ${colors.danger}`,
  borderRadius: "4px",
  margin: "16px 0",
  padding: "12px 16px",
};

const overdueText = {
  color: "#991B1B",
  fontSize: "14px",
  fontWeight: "600" as const,
  lineHeight: "20px",
  margin: "0",
};

const buttonContainer = {
  margin: "24px 0 0",
  textAlign: "center" as const,
};

const button = {
  backgroundColor: colors.danger,
  borderRadius: "6px",
  color: "#FFFFFF",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "600" as const,
  padding: "12px 24px",
  textDecoration: "none",
};
