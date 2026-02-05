// api/scan.js
import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("POST only");

  // Expect JSON body: { "serialNumber": "DEFAULT123" }
  const { serialNumber } = req.body || {};
  if (!serialNumber) return res.status(400).json({ error: "serialNumber required" });

  const scannedAt = new Date().toISOString();
  await kv.set(`scan:${serialNumber}`, scannedAt);

  res.status(200).json({ ok: true, serialNumber, scannedAt });
}
