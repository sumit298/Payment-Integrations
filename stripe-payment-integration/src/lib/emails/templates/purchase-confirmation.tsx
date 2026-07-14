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

interface PurchaseConfirmationEmailProps {
  amount: number;
  currency: string;
  customerEmail: string;
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
  detailLabel,
  detailsBox,
  detailValue,
  detailsTitle,
  detailRow,
  footer,
  link,
} = emailStyles;

export default function PurchaseConfirmationEmail({
  amount,
  currency,
  customerEmail,
}: PurchaseConfirmationEmailProps) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  return (
    <Html>
      <Head />
      <Preview>Your {brand.name} purchase is confirmed!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>{brand.name}</Text>
          </Section>

          <Hr style={divider} />

          <Section style={successBadge}>
            <Text style={successText}>Payment Successful</Text>
          </Section>

          <Heading style={h1}>Thank you for your purchase!</Heading>

          <Text style={text}>
            Your payment has been processed successfully. We are now setting up
            your GitHub repository access. You will receive another email
            shortly with your access link.
          </Text>

          <Section style={detailsBox}>
            <Text style={detailsTitle}>Order Details</Text>

            <Section style={detailRow}>
              <Text style={detailLabel}>Product</Text>
              <Text style={detailValue}>{brand.name}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Amount</Text>
              <Text style={detailValue}>{formattedAmount}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Email</Text>
              <Text style={detailValue}>{customerEmail}</Text>
            </Section>
          </Section>

          <Text style={text}>
            This is a one-time purchase. No recurring charges will be made.
          </Text>

          <Hr style={divider} />

          <Text style={footer}>
            Questions about your purchase? Reply to this email or reach out at{" "}
            <Link href={`mailto:${brand.emails.support}`} style={link}>
              {brand.emails.support}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

PurchaseConfirmationEmail.PreviewProps = {
  amount: 9900,
  currency: "usd",
  customerEmail: "customer@example.com",
} satisfies PurchaseConfirmationEmailProps;
