// api/passentry.js

const PASS_ID = "f108693b82f4e9db533788131bed1baffe2fbcf6";

/**
 * Format: "01 Jan 2026 18:06:12"
 * Note: Vercel typically runs in UTC. If you want a specific timezone, change timeZone below.
 */
function formatTimestamp(date) {
  const timeZone = "UTC"; // change to e.g. "America/New_York" or "Europe/London" if needed

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value;

  // en-GB gives month like "Jan" already; build the exact string order you requested.
  return `${get("day")} ${get("month")} ${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

export default async function handler(req, res) {
  try {
    const token = process.env.PASSENTRY_API_KEY;
    if (!token) {
      return res.status(500).json({ error: "Missing PASSENTRY_API_KEY in Vercel env vars." });
    }

    const now = new Date();
    const formatted = formatTimestamp(now);

    // What will be encoded into the PDF417 barcode:
    const barcodeValue = formatted;

    const url = `https://api.passentry.com/api/v1/passes/${PASS_ID}`;

    const resp = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pass: {
          barcode: {
            enabled: true,
            type: "pdf417",        // PDF417 barcode
            source: "custom",
            value: barcodeValue,   // encodes "01 Jan 2026 18:06:12"
            displayText: true,     // shows the same text under the barcode (set false if you don’t want it)
          },
        },
        message: `Updated: ${formatted}`, // push/update text
      }),
    });

    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return res.status(resp.status).json({
      ok: resp.ok,
      passId: PASS_ID,
      barcodeValue,
      passentryResponse: data,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
