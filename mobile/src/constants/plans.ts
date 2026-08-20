export type PlanCategory = "personal" | "business";

export interface Plan {
  id: string;
  name: string;
  price: number;
  cards: number;
  perCard: number;
  category: PlanCategory;
}

export const GST_RATE = 0.18;

export const PLANS: Plan[] = [
  {
    id: "personal_starter",
    name: "Starter",
    price: 99,
    cards: 50,
    perCard: 2,
    category: "personal",
  },
  {
    id: "personal_popular",
    name: "Popular",
    price: 499,
    cards: 750,
    perCard: 1.5,
    category: "personal",
  },
  {
    id: "personal_pro",
    name: "Pro",
    price: 999,
    cards: 1000,
    perCard: 1,
    category: "personal",
  },
  {
    id: "business_starter",
    name: "Business Starter",
    price: 2499,
    cards: 2775,
    perCard: 0.9,
    category: "business",
  },
  {
    id: "business_pro",
    name: "Business Pro",
    price: 3999,
    cards: 5710,
    perCard: 0.7,
    category: "business",
  },
  {
    id: "business_enterprise",
    name: "Business Enterprise",
    price: 5999,
    cards: 10000,
    perCard: 0.6,
    category: "business",
  },
];

export const getGstAmount = (basePrice: number): number =>
  Math.round(basePrice * GST_RATE);

export const getPlanTotal = (basePrice: number): number =>
  basePrice + getGstAmount(basePrice);