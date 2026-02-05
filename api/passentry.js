// api/passentry.js
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const DEFAULT_NAME = "Alex Birkir Gunnarsson";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const serialNumber = req.query.serialNumber || "DEFAULT123";
  const name = (req.query.name && String(req.query.name).trim()) || DEFAULT_NAME;
  const date = (req.query.date && String(req.query.date).trim()) || new Date().toISOString().slice(0, 10);
  const lastRefresh = new Date().toISOString();

  let lastScanned = "—";
  try {
    lastScanned = (await redis.get(`scan:${serialNumber}`)) || "—";
  } catch {}

  const barcodeMessage =
    `ID=${serialNumber};` +
    `NAME=${name};` +
    `DATE=${date};` +
    `SIG=iceland;` +
    `REFRESH=${lastRefresh}`;

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
    barcode: {
      format: "PKBarcodeFormatPDF417",
      message: barcodeMessage,
      messageEncoding: "iso-8859-1"
    },
    primaryFields: [{ key: "name", label: "Name", value: name }],
    secondaryFields: [{ key: "date", label: "Date", value: date }],
    auxiliaryFields: [{ key: "last_refresh", label: "Last Refresh", value: lastRefresh }],
    backFields: [{ key: "last_scanned", label: "Last Scanned", value: lastScanned }, ...termsBackFields]
  });
}
