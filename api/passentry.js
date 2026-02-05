// api/passentry.js
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const serialNumber = req.query.serialNumber || "DEFAULT123";

  // Þú getur seinna tengt þetta við alvöru DB.
  // Í bili: senda ?name=... og ?date=... ef þú vilt.
  const name = req.query.name || "John Doe";
  const date = req.query.date || new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Þetta breytist á hverju refresh -> Wallet fær nýja útgáfu -> "Updated just now"
  const lastRefresh = new Date().toISOString();

  // Lesum síðasta scan (vistað af api/scan.js)
  const lastScanned = (await redis.get(`scan:${serialNumber}`)) || "—";

  // Scanner-readable payload + fast signature
  // Haltu þessu einföldu (ASCII-ish) fyrir skannara.
  const barcodeMessage =
    `ID=${serialNumber};` +
    `NAME=${name};` +
    `DATE=${date};` +
    `SIG=iceland;` +
    `REFRESH=${lastRefresh}`;

  // Terms text (bak hlið) - skipt niður í bita
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

  // Back: last scanned + terms
  const backFields = [
    { key: "last_scanned", label: "Last Scanned", value: lastScanned },
    ...termsBackFields
  ];

  res.status(200).json({
    serialNumber,

    // PDF417 er oft best fyrir handheld scanners
    barcode: {
      format: "PKBarcodeFormatPDF417",
      message: barcodeMessage,
      messageEncoding: "iso-8859-1"
    },

    // Framhlið: bara nafn + dagsetning
    primaryFields: [{ key: "name", label: "Name", value: name }],
    secondaryFields: [{ key: "date", label: "Date", value: date }],

    // Hjálpar að sýna refresh time (og breytist alltaf)
    auxiliaryFields: [{ key: "last_refresh", label: "Last Refresh", value: lastRefresh }],

    backFields
  });
}
