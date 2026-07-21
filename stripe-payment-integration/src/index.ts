import dotenv from "dotenv";
dotenv.config();

import { serve } from "inngest/express";
import { inngest } from "./lib/job/client";
import {
  handlePurchaseCompleted,
  handlePurchaseFollowUp,
  handleRefund,
  handleCheckoutExpired,
} from "./lib/job/functions/stripe";
import app from "./server/api";

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [
      handlePurchaseCompleted,
      handlePurchaseFollowUp,
      handleRefund,
      handleCheckoutExpired,
    ],
  })
);

import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.get("/db-test", async (_req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Inngest endpoint: http://localhost:${PORT}/api/inngest`);
});
