// api/passentry.js
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Hard default (used when PassEntry doesn't provide a name)
const DEFAULT_NAME = "Alex Birkir Gunnarsson";

export default async function handler(req, res) {
  // Prevent caching anywhere in the chain
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const serialNumber = req.query.serialNumber || "DEFAULT123";

  // If you ever *do* pass a name manually (?name=...), it will override the default.
  // Otherwise the default is Alex Birkir Gunnarsson.
  const name = (req.query.name && String(req.query.name).trim()) || DEFAULT_NAME;

  // Date shown on the pass (you can hardcode if you want)
  const date = (req.query.date && String(req.query.date).trim()) || new Date().toISOString().slice(0, 10);

  // Changes every request => Wallet sees a new pass version when it actually fetches an update
  const lastRefresh = new Date().toISOString();

  // Last scanned stored by /api/scan
  let lastScanned = "—";
  try {
    lastScanned = (await redis.get(`scan:${serialNumber}`)) || "—";
  } catch {
    // If Redis env vars aren't set, don't crash the pass endpoint
    lastScanned = "—";
  }

  // Scanner-readable payload + fixed signature
  const barcodeMessage =
    `ID=${serialNumber};` +
    `NAME=${name};` +
    `DATE=${date};` +
    `SIG=iceland;` +
    `REFRESH=${lastRefresh}`;

  // Terms (back side), split into chunks for Wallet display reliability
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

  res.status(200).json({
    serialNumber,

    // PDF417 tends to be scanner-friendly
    barcode: {
      format: "PKBarcodeFormatPDF417",
      message: barcodeMessage,
      messageEncoding: "iso-8859-1"
    },

    // Front: only Name + Date
    primaryFields: [{ key: "name", label: "Name", value: name }],
    secondaryFields: [{ key: "date", label: "Date", value: date }],

    // Changes every refresh
    auxiliaryFields: [{ key: "last_refresh", label: "Last Refresh", value: lastRefresh }],

    // Back: last scanned + terms
    backFields: [{ key: "last_scanned", label: "Last Scanned", value: lastScanned }, ...termsBackFields]
  });
}
