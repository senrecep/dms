import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { emailStrings, type EmailLocale } from "../translations";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000";

const colors = {
  primary: "#2C3E50",
  accent: "#5DADE2",
  danger: "#E74C3C",
  success: "#27AE60",
  muted: "#7F8C8D",
  bg: "#F8F9FA",
  white: "#FFFFFF",
};

interface EmailLayoutProps {
  preview: string;
  children: ReactNode;
  locale?: EmailLocale;
}

export function EmailLayout({ preview, children, locale = "tr" }: EmailLayoutProps) {
  const tc = emailStrings[locale].common;

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ width: "100%" }}>
              <tr>
                <td style={{ verticalAlign: "middle" }}>
                  <Img
                    src={`${appUrl}/logo.svg`}
                    width="36"
                    height="36"
                    alt="DMS"
                    style={logoImg}
                  />
                </td>
                <td style={{ verticalAlign: "middle", paddingLeft: "12px" }}>
                  <Text style={logoText}>DMS</Text>
                </td>
              </tr>
            </table>
          </Section>
          <Section style={content}>{children}</Section>
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>{tc.footer}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: colors.bg,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: "0",
  padding: "0",
};

const container = {
  backgroundColor: colors.white,
  borderRadius: "8px",
  margin: "40px auto",
  maxWidth: "560px",
  border: `1px solid #E5E7EB`,
};

const header = {
  backgroundColor: colors.primary,
  borderRadius: "8px 8px 0 0",
  padding: "24px 32px",
};

const logoImg = {
  borderRadius: "8px",
};

const logoText = {
  color: colors.white,
  fontSize: "20px",
  fontWeight: "700" as const,
  margin: "0",
  letterSpacing: "1px",
};

const content = {
  padding: "32px",
};

const hr = {
  borderColor: "#E5E7EB",
  margin: "0",
};

const footer = {
  padding: "16px 32px",
};

const footerText = {
  color: colors.muted,
  fontSize: "12px",
  margin: "0",
  textAlign: "center" as const,
};

export { colors };
