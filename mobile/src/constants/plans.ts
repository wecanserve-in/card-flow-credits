export const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    interval: "Lifetime",
    scans: 5,
    popular: false,
    features: [
      "5 Lifetime Business Card Scans",
      "Excel Export",
      "Basic OCR",
    ],
  },

  {
    id: "starter",
    name: "Starter",
    price: 99,
    interval: "Month",
    scans: 50,
    popular: true,
    features: [
      "50 Business Card Scans",
      "Excel Export",
      "Priority Processing",
    ],
  },

  {
    id: "pro",
    name: "Pro",
    price: 199,
    interval: "Month",
    scans: 150,
    popular: false,
    features: [
      "150 Business Card Scans",
      "Priority Processing",
      "Faster OCR Queue",
    ],
  },

  {
    id: "business",
    name: "Business",
    price: 499,
    interval: "Month",
    scans: 500,
    popular: false,
    features: [
      "500 Business Card Scans",
      "Business Support",
      "Priority Processing",
    ],
  },

  // ---------- YEARLY ----------

  {
    id: "starter_yearly",
    name: "Starter",
    price: 950,
    interval: "Year",
    scans: 600,
    popular: true,
    features: [
      "600 Business Card Scans / Year",
      "Save 20%",
      "Excel Export",
      "Priority Processing",
    ],
  },

  {
    id: "pro_yearly",
    name: "Pro",
    price: 1900,
    interval: "Year",
    scans: 1800,
    popular: false,
    features: [
      "1800 Business Card Scans / Year",
      "Save 20%",
      "Priority Processing",
      "Faster OCR Queue",
    ],
  },

  {
    id: "business_yearly",
    name: "Business",
    price: 4790,
    interval: "Year",
    scans: 6000,
    popular: false,
    features: [
      "6000 Business Card Scans / Year",
      "Save 20%",
      "Business Support",
      "Priority Processing",
    ],
  },
];