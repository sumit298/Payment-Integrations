import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  }),
  user: {
    additionalFields: {
      githubUsername: { type: "string", nullable: true },
    },
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      mapProfileToUser: (profile) => ({ githubUsername: profile.login }),
    },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
});
