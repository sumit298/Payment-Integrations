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

interface AccessRevokedEmailProps {
  customerEmail: string;
  refundAmount: number;
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

export default function AccessRevokedEmail({
  customerEmail,
  refundAmount,
  currency,
}: AccessRevokedEmailProps) {
  const formattedRefund = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(refundAmount / 100);

  return (
    <Html>
      <Head />
      <Preview>Your refund has been processed</Preview>

      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>{brand.name}</Text>
          </Section>

          <Hr style={divider} />

          <Heading style={h1}>Refund Processed</Heading>

          <Text style={text}>
            Your refund has been completed successfully. As this was a full
            refund, your access to the private GitHub repository has been
            revoked.
          </Text>

          <Section style={detailsBox}>
            <Text style={detailsTitle}>Refund Details</Text>

            <Section style={detailRow}>
              <Text style={detailLabel}>Refund Amount</Text>
              <Text style={detailValue}>{formattedRefund}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Email</Text>
              <Text style={detailValue}>{customerEmail}</Text>
            </Section>

            <Section style={detailRow}>
              <Text style={detailLabel}>Repository Access</Text>
              <Text style={detailValue}>Revoked</Text>
            </Section>
          </Section>

          <Text style={text}>
            If you believe this refund was processed in error, please contact
            our support team.
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

AccessRevokedEmail.PreviewProps = {
  customerEmail: "customer@example.com",
  refundAmount: 9900,
  currency: "usd",
} satisfies AccessRevokedEmailProps;