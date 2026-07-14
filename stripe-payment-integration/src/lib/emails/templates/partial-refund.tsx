import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { brand } from "../../brand";
import { emailStyles } from "../styles";

interface PartialRefundEmailProps {
  customerEmail: string;
  refundAmount: number;
  originalAmount: number;
  currency: string;
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
  link,
} = emailStyles;

export default function PartialRefundEmail({
  customerEmail,
  refundAmount,
  originalAmount,
  currency,
}: PartialRefundEmailProps) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  });

  const formattedOriginal = formatter.format(originalAmount / 100);
  const formattedRefund = formatter.format(refundAmount / 100);
  const formattedRemaining = formatter.format(
    (originalAmount - refundAmount) / 100
  );

  return (
    <Html>
      <Head />
      <Preview>Your partial refund has been processed</Preview>

      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>{brand.name}</Text>
          </Section>

          <Hr style={divider} />

          <Heading style={h1}>Partial Refund Processed</Heading>

          <Text style={text}>
            A partial refund has been successfully processed for your purchase.
            Your GitHub repository access remains active.
          </Text>

          <Section style={detailsBox}>
            <Text style={detailsTitle}>Refund Summary</Text>

            <Section style={detailRow}>
              <Text style={detailLabel}>Original Purchase</Text>
              <Text style={detailValue}>{formattedOriginal}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Refunded</Text>
              <Text style={detailValue}>{formattedRefund}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Remaining Value</Text>
              <Text style={detailValue}>{formattedRemaining}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Email</Text>
              <Text style={detailValue}>{customerEmail}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Repository Access</Text>
              <Text style={detailValue}>Still Active</Text>
            </Section>
          </Section>

          <Text style={text}>
            Thank you for your purchase. If you have any questions regarding
            this refund, we're happy to help.
          </Text>

          <Hr style={divider} />

          <Text style={footer}>
            Need help? Contact{" "}
            <Link href={`mailto:${brand.emails.support}`} style={link}>
              {brand.emails.support}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

PartialRefundEmail.PreviewProps = {
  customerEmail: "customer@example.com",
  refundAmount: 2000,
  originalAmount: 9900,
  currency: "usd",
} satisfies PartialRefundEmailProps;