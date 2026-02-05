// api/passentry.js
// Visiting /api/passentry will update the PassEntry pass barcode value to include a fresh timestamp.

const PASS_ID = "f108693b82f4e9db533788131bed1baffe2fbcf6";

export default async function handler(req, res) {
  try {
    const token = process.env.PASSENTRY_API_KEY; // Set this in Vercel Env Vars
    if (!token) {
      return res.status(500).json({
        error: "Missing PASSENTRY_API_KEY in Vercel Environment Variables.",
      });
    }

    const now = new Date().toISOString();

    // Barcode value you want (edit prefix as you like)
    const barcodeValue = `ID|${now}`;

    // PassEntry Update Pass endpoint
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
            type: "qr",
            source: "custom",
            value: barcodeValue,
            displayText: true,
          },
        },

        // This is the push notification text (optional but recommended)
        // It helps trigger the Wallet update flow.
        message: `Updated: ${now}`,
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
      now,
      barcodeValue,
      passentryResponse: data,
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
