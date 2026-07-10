import "dotenv/config";
import express from "express";
import cors from "cors";
import { initDb } from "./db";
import { registerRouter } from "./routes/register";
import { loginRouter } from "./routes/login";
import { statusRouter } from "./routes/status";
import { assignRouter } from "./routes/assign";
import { positionsRouter } from "./routes/positions";
import { adminRouter } from "./routes/admin";

if (!process.env.JWT_SECRET || !process.env.ADMIN_PASSWORD) {
  throw new Error("JWT_SECRET and ADMIN_PASSWORD must be set (see .env.example).");
}

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(express.json());

app.use(registerRouter);
app.use(loginRouter);
app.use(statusRouter);
app.use(assignRouter);
app.use(positionsRouter);
app.use(adminRouter);

const port = Number(process.env.PORT ?? 4000);

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Osusu server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
