export type PlanCategory = "personal" | "business";

export interface Plan {
  id: string;
  name: string;
  price: number;
  cards: number;
  /** Price of one card before GST (price ÷ cards), rounded to paise. */
  perCard: number;
  category: PlanCategory;
}

const perCard = (price: number, cards: number): number =>
  Math.round((price / cards) * 100) / 100;

export const GST_RATE = 0.18;

export const PLANS: Plan[] = [
  {
    id: "personal_starter",
    name: "Starter",
    price: 99,
    cards: 50,
    perCard: perCard(99, 50),
    category: "personal",
  },
  {
    id: "personal_popular",
    name: "Popular",
    price: 499,
    cards: 330,
    perCard: perCard(499, 330),
    category: "personal",
  },
  {
    id: "personal_pro",
    name: "Pro",
    price: 999,
    cards: 1000,
    perCard: perCard(999, 1000),
    category: "personal",
  },
  {
    id: "business_starter",
    name: "Business Starter",
    price: 2499,
    cards: 2775,
    perCard: perCard(2499, 2775),
    category: "business",
  },
  {
    id: "business_pro",
    name: "Business Pro",
    price: 3999,
    cards: 5710,
    perCard: perCard(3999, 5710),
    category: "business",
  },
  {
    id: "business_enterprise",
    name: "Business Enterprise",
    price: 5999,
    cards: 10000,
    perCard: perCard(5999, 10000),
    category: "business",
  },
];

export const getGstAmount = (basePrice: number): number =>
  Math.round(basePrice * GST_RATE);

export const getPlanTotal = (basePrice: number): number =>
  basePrice + getGstAmount(basePrice);