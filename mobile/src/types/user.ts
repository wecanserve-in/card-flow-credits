export interface User {
  uid: string;
  name: string;
  email: string;
  photoURL: string;

  planName: string;
  cardLimit: number;
  cardsUsed: number;
  exportsGenerated: number;

  subscriptionActive: boolean;
  authProvider: string;

  createdAt: any;
}