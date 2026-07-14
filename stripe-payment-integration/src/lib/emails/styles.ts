export const colors = {
  primary: "#d97757",
  background: "#faf9f5",
  foreground: "#30302e",
  muted: "#6b6860",
  border: "#e5e4df",
  card: "#ffffff",
  success: "#16a34a",
  successLight: "#f0fdf4",
  danger: "#dc2626",
  dangerLight: "#fef2f2",
};

export const emailStyles = {
  main: {
    backgroundColor: colors.background,
    margin: 0,
    padding: "40px 0",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },

  container: {
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: "12px",
    overflow: "hidden",
  },

  header: {
    padding: "24px 32px",
    textAlign: "center" as const,
  },

  logoText: {
    fontSize: "28px",
    fontWeight: "700",
    color: colors.primary,
    margin: 0,
  },

  divider: {
    borderColor: colors.border,
    margin: 0,
  },

  successBadge: {
    backgroundColor: colors.successLight,
    width: "fit-content",
    margin: "32px auto 16px",
    padding: "8px 16px",
    borderRadius: "999px",
  },

  successText: {
    color: colors.success,
    fontSize: "14px",
    fontWeight: "600",
    margin: 0,
  },

  h1: {
    fontSize: "30px",
    fontWeight: "700",
    color: colors.foreground,
    textAlign: "center" as const,
    margin: "24px 32px",
  },

  text: {
    fontSize: "16px",
    lineHeight: "26px",
    color: colors.foreground,
    margin: "0 32px 24px",
  },

  detailsBox: {
    margin: "32px",
    padding: "24px",
    backgroundColor: "#f8f8f8",
    border: `1px solid ${colors.border}`,
    borderRadius: "8px",
  },

  detailsTitle: {
    fontSize: "18px",
    fontWeight: "600",
    marginBottom: "16px",
    color: colors.foreground,
  },

  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "12px",
  },

  detailLabel: {
    color: colors.muted,
    fontSize: "14px",
  },

  detailValue: {
    color: colors.foreground,
    fontSize: "14px",
    fontWeight: "600",
  },

  footer: {
    fontSize: "14px",
    color: colors.muted,
    textAlign: "center" as const,
    margin: "32px",
    lineHeight: "22px",
  },

  link: {
    color: colors.primary,
    textDecoration: "none",
  },

  buttonContainer: {
    textAlign: "center" as const,
    margin: "32px 0",
  },

  button: {
    backgroundColor: colors.primary,
    color: "#ffffff",
    borderRadius: "8px",
    padding: "14px 28px",
    textDecoration: "none",
    fontWeight: "600",
    fontSize: "16px",
  },

  infoBox: {
    margin: "32px",
    padding: "24px",
    backgroundColor: "#f8f8f8",
    border: `1px solid ${colors.border}`,
    borderRadius: "8px",
  },

  infoTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: "16px",
  },

  infoText: {
    fontSize: "15px",
    lineHeight: "24px",
    color: colors.foreground,
    margin: "8px 0",
  },

  codeStyle: {
    backgroundColor: "#f3f4f6",
    padding: "2px 6px",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "14px",
  },

  textSmall: {
  fontSize: "14px",
  lineHeight: "22px",
  color: colors.muted,
  margin: "0 32px 16px",
},
};
