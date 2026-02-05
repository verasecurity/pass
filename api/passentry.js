export default function handler(req, res) {
  // Current timestamp
  const now = new Date().toISOString();

  // Serial number from query or default
  const serialNumber = req.query.serialNumber || "DEFAULT123";

  // JSON response for PassEntry
  res.status(200).json({
    serialNumber: serialNumber,
    barcode: {
      format: "PKBarcodeFormatQR",
      message: `USER123|${now}`, // barcode includes timestamp
      messageEncoding: "iso-8859-1"
    },
    secondaryFields: [
      {
        key: "last_update",
        label: "Last Refresh",
        value: now
      }
    ]
  });
}
