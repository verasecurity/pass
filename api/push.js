// api/push.js
const PASS_ID = "f108693b82f4e9db533788131bed1baffe2fbcf6";

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).send("POST only");

    const apiKey = mustEnv("PASSENTRY_API_KEY");
    const origin = `https://${req.headers.host}`;

    // 1) sækja nýjustu gögnin úr okkar JSON endpointi
    const dataResp = await fetch(`${origin}/api/passentry`, { cache: "no-store" });
    if (!dataResp.ok) throw new Error(`Failed to fetch /api/passentry: ${dataResp.status}`);
    const data = await dataResp.json();

    // 2) Update pass í PassEntry
    // ATH: Endpoint + payload þarf að matcha nákvæmlega PassEntry API docs hjá þér.
    // Hér er “generic” PATCH á /passes/{id}.
    const updateResp = await fetch(`https://api.passentry.com/v1/passes/${PASS_ID}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        barcode: data.barcode,
        primaryFields: data.primaryFields,
        secondaryFields: data.secondaryFields,
        auxiliaryFields: data.auxiliaryFields,
        backFields: data.backFields
      })
    });

    const updateText = await updateResp.text();
    if (!updateResp.ok) {
      return res.status(502).json({ error: "passentry_update_failed", status: updateResp.status, body: updateText });
    }

    // 3) Send Notification (push til Wallet)
    const notifyResp = await fetch(`https://api.passentry.com/v1/passes/${PASS_ID}/notification`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: "Updated" })
    });

    const notifyText = await notifyResp.text();
    if (!notifyResp.ok) {
      return res.status(502).json({ error: "passentry_notify_failed", status: notifyResp.status, body: notifyText });
    }

    res.status(200).json({ ok: true, passId: PASS_ID });
  } catch (err) {
    res.status(500).json({ error: "push_failed", message: err?.message || String(err) });
  }
}
