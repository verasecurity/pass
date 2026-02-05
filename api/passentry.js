// api/passentry.js
import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  const serialNumber = req.query.serialNumber || "DEFAULT123";

  // Put your real name lookup here (DB), or pass it via query for now.
  const name = req.query.name || "John Doe";

  // Date shown on the pass (issue date / valid-to / whatever you want)
  const date = req.query.date || new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // This forces "Updated just now" because it changes on every refresh
  const lastRefresh = new Date().toISOString();

  // Read last scan time saved by api/scan.js
  const lastScanned = (await kv.get(`scan:${serialNumber}`)) || "—";

  // Scanner-readable payload + fixed signature
  // Keep ASCII-ish to avoid weird scanner decoding issues.
  const barcodeMessage = `ID=${serialNumber};NAME=${name};DATE=${date};SIG=iceland;REFRESH=${lastRefresh}`;

  // Terms (back of pass) split into chunks so Wallet displays reliably
  const termsLines = [
    "ÚTGEFANDI SKÍRTEINIS:",
    "Ríkislögreglustjóri",
    "Heimilisfang: Skúlagata 21, 101 Reykjavík",
    "Sími: 444 2500",
    "Vefur: www.logreglan.is",
    "",
    "ÖKURÉTTINDI:",
    "Réttindaflokkur B, Fólksbifreið/sendibifreið",
    "- Gildir til 05-08-2055",
    "",
    "TÁKNTÖLUR:",
    "",
    "MIG VANTAR AÐSTOÐ:",
    "Ef þig vantar aðstoð hafðu samband við",
    "www.syslumenn.is eða sendu póst á",
    "okuskrirteini@island.is",
    "",
    "UPPFÆRSLUR ÖKUSKÍRTEINIS:",
    "Til þess að uppfæra stafræna ökuskírteinið þarf",
    "að sækja aftur um inni á www.Island.is/okuskrirteini og velja: Búa til nýja umsókn",
    "",
    "FLOKKAR ÖKURÉTTINDA:",
    "www.samgongustofa.is/okurettindi",
    "",
    "FRAMVÍSUN STAFRÆNS ÖKUSKÍRTEINIS:",
    "Með framvísun stafræns ökuskírteinis veitir skírteinshafi samþykki sitt fyrir því að réttmæti þess sé staðfest",
    "með notkun hugbúnaðarinnar sem sækir upplýsingar (í ökuskírteinagrunni Ríkislögreglustjóra).",
    "www.island.is/okuskrirteini"
  ];

  const chunkSize = 8;
  const termsBackFields = [];
  for (let i = 0; i < termsLines.length; i += chunkSize) {
    termsBackFields.push({
      key: `terms_${Math.floor(i / chunkSize) + 1}`,
      label: i === 0 ? "Terms" : "",
      value: termsLines.slice(i, i + chunkSize).join("\n")
    });
  }

  // Also show last scanned on the back (optional but useful)
  const backFields = [
    { key: "last_scanned", label: "Last Scanned", value: lastScanned },
    ...termsBackFields
  ];

  res.status(200).json({
    serialNumber,

    // Most handheld scanners handle PDF417 well.
    barcode: {
      format: "PKBarcodeFormatPDF417",
      message: barcodeMessage,
      messageEncoding: "iso-8859-1"
    },

    // Front of pass: only name + date (as requested)
    primaryFields: [{ key: "name", label: "Name", value: name }],
    secondaryFields: [{ key: "date", label: "Date", value: date }],

    // This changing field helps ensure the pass content changes every refresh
    auxiliaryFields: [{ key: "last_refresh", label: "Last Refresh", value: lastRefresh }],

    // Back of pass: last scanned + terms
    backFields
  });
}
