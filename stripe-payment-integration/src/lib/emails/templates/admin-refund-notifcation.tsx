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

interface AdminRefundNotificationEmailProps {
  customerName: string | null;
  customerEmail: string;
  githubUsername?: string | null;
  refundAmount: number;
  originalAmount: number;
  currency: string;
  stripeChargeId: string;
  accessRevoked: boolean;
  isPartialRefund: boolean;
}

const {
  main,
  container,
  header,
  logoText,
  divider,
  h1,
  text,
  detailsBox,
  detailsTitle,
  detailRow,
  detailLabel,
  detailValue,
  footer,
} = emailStyles;

export default function AdminRefundNotificationEmail({
  customerName,
  customerEmail,
  githubUsername,
  refundAmount,
  originalAmount,
  currency,
  stripeChargeId,
  accessRevoked,
  isPartialRefund,
}: AdminRefundNotificationEmailProps) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  });

  const formattedOriginal = formatter.format(originalAmount / 100);
  const formattedRefund = formatter.format(refundAmount / 100);

  return (
    <Html>
      <Head />
      <Preview>
        {isPartialRefund ? "Partial Refund" : "Full Refund"} processed
      </Preview>

      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>{brand.name}</Text>
          </Section>

          <Hr style={divider} />

          <Heading style={h1}>
            {isPartialRefund
              ? "Partial Refund Processed"
              : "Full Refund Processed"}
          </Heading>

          <Text style={text}>
            A customer refund has been successfully processed. Review the
            details below.
          </Text>

          <Section style={detailsBox}>
            <Text style={detailsTitle}>Refund Details</Text>

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
                {githubUsername ?? "Not Provided"}
              </Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Refund Type</Text>
              <Text style={detailValue}>
                {isPartialRefund ? "Partial" : "Full"}
              </Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Original Amount</Text>
              <Text style={detailValue}>{formattedOriginal}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Refund Amount</Text>
              <Text style={detailValue}>{formattedRefund}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Repository Access</Text>
              <Text style={detailValue}>
                {accessRevoked ? "Revoked" : "Still Active"}
              </Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Stripe Charge</Text>
              <Text style={detailValue}>{stripeChargeId}</Text>
            </Section>
          </Section>

          <Text style={text}>
            {accessRevoked
              ? "GitHub repository access has been removed automatically."
              : "Repository access remains active because this was a partial refund."}
          </Text>

          <Hr style={divider} />

          <Text style={footer}>
            Automated refund notification from {brand.name}.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

AdminRefundNotificationEmail.PreviewProps = {
  customerName: "John Doe",
  customerEmail: "john@example.com",
  githubUsername: "johndoe",
  refundAmount: 9900,
  originalAmount: 9900,
  currency: "usd",
  stripeChargeId: "ch_123456789",
  accessRevoked: true,
  isPartialRefund: false,
} satisfies AdminRefundNotificationEmailProps;