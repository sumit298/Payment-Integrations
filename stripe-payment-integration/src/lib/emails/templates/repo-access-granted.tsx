import {
  Body,
  Button,
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

const {
  main,
  container,
  header,
  logoText,
  divider,
  h1,
  text,
  infoBox,
  infoText,
  infoTitle,
  button,
  buttonContainer,
  codeStyle,
  footer,
  link,
} = emailStyles;

interface RepoAccessGrantedEmailProps {
  repoUrl: string;
}

export default function RepoAccessGrantedEmail({
  repoUrl,
}: RepoAccessGrantedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your {brand.name} repository access is ready!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logoText}>{brand.name}</Text>
          </Section>

          <Hr style={divider} />

          <Heading style={h1}>You are in!</Heading>

          <Text style={text}>
            Your GitHub repository access has been granted. You now have full
            access to the {brand.name} codebase.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={repoUrl}>
              Open Repository
            </Button>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>Quick Start</Text>
            <Text style={infoText}>
              <strong>1.</strong> Clone the repository to your machine
            </Text>
            <Text style={infoText}>
              <strong>2.</strong> Run <code style={codeStyle}>bun install</code>{" "}
              to install dependencies
            </Text>
            <Text style={infoText}>
              <strong>3.</strong> Follow the README for environment setup
            </Text>
            <Text style={infoText}>
              <strong>4.</strong> Run <code style={codeStyle}>bun dev</code> to
              start building
            </Text>
          </Section>

          <Hr style={divider} />

          <Text style={footer}>
            Need help? Reply to this email or reach out at{" "}
            <Link href={`mailto:${brand.emails.support}`} style={link}>
              {brand.emails.support}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
