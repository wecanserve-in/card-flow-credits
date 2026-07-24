export interface User {
  uid: string;
  name: string;
  email: string;
  photoURL: string;

  planId: string;
  planName: string;
  freeScanLimit: number;
  freeScansUsed: number;
  exportsGenerated: number;

  subscriptionActive: boolean;
  subscriptionExpiry: number | null;
  subscriptionStartedAt?: number;

  lastPaymentId?: string;
  lastOrderId?: string;

  authProvider: string;

  createdAt: any;
  updatedAt?: number;
}
