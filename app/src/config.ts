/* Single source of truth for brand + demo config. Nothing here is
   duplicated elsewhere. Motto/contact details are client-supplied and are
   NOT independently verified. */

export const CONFIG = {
  company: "Pave-Con Ltd",
  tagline: "Paving & Construction",
  formTitle: "Masterbuilders - Site Diary",
  motto: "CHOOSE WISELY... BUILD WITH CONFIDENCE",
  contact: {
    address: "Lot 1 Dunsinane Hatfield P.O., Manchester, Jamaica W.I.",
    phone: "[876] 625-7283",
    email: "info@paveconja.com",
  },
  contactNote: "Supplied by the client, not independently verified.",
  activation: { exampleCode: "PAVECON-DEMO", storeKey: "activation" },
  brand: { yellow: "#FCE501" }, // measured median of logo yellow pixels
  features: { weatherSuggest: false, dictation: false, haptics: true },
} as const;

export type WeatherKey =
  | "clear"
  | "partly"
  | "overcast"
  | "showers"
  | "heavy"
  | "storm";

export type LossKey =
  | "none"
  | "rain"
  | "breakdown"
  | "materials"
  | "utilities"
  | "access"
  | "other";

export type Unit =
  | "tonnes"
  | "bags"
  | "loads"
  | "pcs"
  | "lengths"
  | "m³"
  | "gal"
  | "rolls"
  | "kg";

