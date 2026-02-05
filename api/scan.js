// api/scan.js
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");

  // Body: { "serialNumber": "DEFAULT123" }
  const { serialNumber } = req.body || {};
  if (!serialNumber) return res.status(400).json({ error: "serialNumber required" });

  const scannedAt = new Date().toISOString();
  await redis.set(`scan:${serialNumber}`, scannedAt);

  res.status(200).json({ ok: true, serialNumber, scannedAt });
}
