import { Button, Heading, Text, Section } from "@react-email/components";
import { EmailLayout, colors } from "./layout";
import { emailStrings, type EmailLocale } from "../translations";

interface WelcomeEmailProps {
  userName: string;
  resetUrl: string;
  locale?: EmailLocale;
}

export function WelcomeEmail({ userName, resetUrl, locale = "tr" }: WelcomeEmailProps) {
  const t = emailStrings[locale].welcome;

  return (
    <EmailLayout preview={t.preview} locale={locale}>
      <Heading style={heading}>{t.heading}</Heading>
      <Text style={text}>
        {t.body.replace("{userName}", userName)}
      </Text>
      <Section style={infoBox}>
        <Text style={infoText}>{t.info}</Text>
      </Section>
      <Section style={buttonContainer}>
        <Button style={button} href={resetUrl}>
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
  backgroundColor: "#F3F4F6",
  borderRadius: "6px",
  padding: "12px 16px",
  margin: "16px 0",
};

const infoText = {
  color: colors.muted,
  fontSize: "13px",
  lineHeight: "20px",
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

export default WelcomeEmail;
