import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { brand } from "../../brand";
import { emailStyles } from "../styles";

interface AdminPurchaseNotificationEmailProps {
  customerName: string | null;
  customerEmail: string;
  amount: number;
  currency: string;
  stripeSessionId: string;
  githubUsername?: string | null;
}

const {
  main,
  container,
  header,
  logoText,
  divider,
  successBadge,
  successText,
  h1,
  text,
  detailsBox,
  detailsTitle,
  detailRow,
  detailLabel,
  detailValue,
  footer,
} = emailStyles;

export default function AdminPurchaseNotificationEmail({
  customerName,
  customerEmail,
  amount,
  currency,
  stripeSessionId,
  githubUsername,
}: AdminPurchaseNotificationEmailProps) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  return (
    <Html>
      <Head />
      <Preview>🎉 New {brand.name} purchase</Preview>

      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>{brand.name}</Text>
          </Section>

          <Hr style={divider} />

          <Section style={successBadge}>
            <Text style={successText}>New Purchase</Text>
          </Section>

          <Heading style={h1}>A new order has been received</Heading>

          <Text style={text}>
            A customer has successfully completed their purchase. The purchase
            workflow will now grant repository access automatically.
          </Text>

          <Section style={detailsBox}>
            <Text style={detailsTitle}>Purchase Details</Text>

            <Section style={detailRow}>
              <Text style={detailLabel}>Customer</Text>
              <Text style={detailValue}>{customerName}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Email</Text>
              <Text style={detailValue}>{customerEmail}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>GitHub</Text>
              <Text style={detailValue}>
                {githubUsername ?? "Not provided"}
              </Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Product</Text>
              <Text style={detailValue}>{brand.name}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Amount</Text>
              <Text style={detailValue}>{formattedAmount}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Stripe Session</Text>
              <Text style={detailValue}>{stripeSessionId}</Text>
            </Section>
          </Section>

          <Text style={text}>
            If the customer has provided a GitHub username, repository access
            will be granted automatically by the purchase workflow.
          </Text>

          <Hr style={divider} />

          <Text style={footer}>
            This is an automated notification from {brand.name}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

AdminPurchaseNotificationEmail.PreviewProps = {
  customerName: "John Doe",
  customerEmail: "john@example.com",
  amount: 9900,
  currency: "usd",
  stripeSessionId: "cs_test_a1b2c3d4e5f6",
} satisfies AdminPurchaseNotificationEmailProps;
