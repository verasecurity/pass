// api/passentry.js

const PASS_ID = "f108693b82f4e9db533788131bed1baffe2fbcf6";

/**
 * Format: "01 Jan 2026 18:06:12" in GMT
 */
function formatTimestamp(date) {
  const timeZone = "Etc/GMT"; // GMT

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

  return `${get("day")} ${get("month")} ${get("year")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

export default async function handler(req, res) {
  try {
    const token = process.env.PASSENTRY_API_KEY;
    if (!token) {
      return res.status(500).json({ error: "Missing PASSENTRY_API_KEY in Vercel env vars." });
    }

    const formatted = formatTimestamp(new Date());

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
            type: "pdf417",
            source: "custom",
            value: formatted,
            displayText: true,
          },
        },
        message: `Updated: ${formatted}`,
      }),
    });

    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return res.status(resp.status).json({ ok: resp.ok, passId: PASS_ID, barcodeValue: formatted, passentryResponse: data });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
