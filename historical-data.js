// De-identified aggregate counts from 2021–2026 ABO discrepancy records.
// Categories can overlap and must not be interpreted as diagnostic probabilities.
window.aboHistoricalData = Object.freeze({
  totalRows: 537,
  rowsWithReactions: 480,
  years: {2021:66,2022:71,2023:92,2024:140,2025:110,2026:58},
  contexts: {
    SUBGROUP: 184,
    UNEXPECTED_ALLOANTIBODY: 113,
    AUTOANTIBODY: 86,
    WEAK_REVERSE: 66,
    "BMT/TRANSPLANT": 64,
    COLD_REACTIVE: 41,
    ROULEAUX: 13
  }
});
