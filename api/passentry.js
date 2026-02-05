// api/update-pass.js
export default async function handler(req, res) {
  const now = new Date().toISOString();

  const passId = req.query.passId; // or serialNumber, depending on your setup
  if (!passId) return res.status(400).json({ error: "Missing passId" });

  const r = await fetch(`https://api.passentry.com/v1/passes/${passId}`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${process.env.PASSENTRY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      barcode: {
        format: "PKBarcodeFormatQR",
        message: `USER123|${now}`,
        messageEncoding: "iso-8859-1"
      },
      // This is what triggers the push update in many pass platforms:
      message: "Updated"
    }),
  });

  const data = await r.json().catch(() => ({}));
  res.status(r.status).json({ ok: r.ok, now, data });
}
