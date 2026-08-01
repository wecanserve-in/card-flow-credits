export interface User {
  uid: string;

  name: string;

  email: string;

  photoURL: string;


  // Current plan
  planId?: string;

  planName?: string;


  // Purchased package
  packId?: string;

  packName?: string;


  // New credit system
  totalScans?: number;

  usedScans?: number;

  remainingScans?: number;


  // Old free system (fallback)
  freeScanLimit?: number;

  freeScansUsed?: number;


  cardLimit?: number;

  cardsUsed?: number;


  exportsGenerated?: number;


  subscriptionActive?: boolean;

  subscriptionExpiry?: number | null;

  subscriptionStartedAt?: number;


  lastPaymentId?: string;

  lastOrderId?: string;


  authProvider?: string;


  createdAt?: any;

  updatedAt?: number;
}