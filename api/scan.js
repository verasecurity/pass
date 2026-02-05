// api/scan.js
import { Redis } from "@upstash/redis";
const redis = Redis.fromEnv();

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");

  const body = await readJson(req);
  const serialNumber = body.serialNumber;
  if (!serialNumber) return res.status(400).json({ error: "serialNumber required" });

  const scannedAt = new Date().toISOString();
  await redis.set(`scan:${serialNumber}`, scannedAt);

  res.status(200).json({ ok: true, serialNumber, scannedAt });
}
