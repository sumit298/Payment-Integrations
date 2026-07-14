import {
  Body,
  Button,
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

const {
  main,
  container,
  header,
  logoText,
  divider,
  h1,
  text,

  button,
  buttonContainer,
  textSmall,
  footer,
} = emailStyles;

interface AbandonedCartEmailProps {
  customerEmail: string;
  checkoutUrl: string;
}

export default function AbandonedCartEmail({
  customerEmail,
  checkoutUrl,
}: AbandonedCartEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your {brand.name} checkout is waiting for you</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>{brand.name}</Text>
          </Section>

          <Hr style={divider} />

          <Heading style={h1}>You left something behind</Heading>

          <Text style={text}>
            We noticed you started a checkout but did not complete your
            purchase. No worries. Your cart is still waiting for you.
          </Text>

          <Text style={text}>
            {brand.name} gives you everything you need to ship your startup this
            weekend: authentication, payments, email, background jobs, and more.
            All wired together and ready to go.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={checkoutUrl}>
              Complete Your Purchase
            </Button>
          </Section>

          <Text style={textSmall}>
            If you ran into any issues during checkout or have questions about{" "}
            {brand.name}, just reply to this email. I read every message
            personally.
          </Text>

          <Hr style={divider} />

          <Text style={footer}>
            This email was sent to {customerEmail} because you started a
            checkout on {brand.name}. If this was not you, you can safely ignore
            this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
