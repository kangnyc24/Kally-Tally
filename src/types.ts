export enum Category {
  GROCERIES = "Groceries",
  MISC = "Misc",
  HEALTH = "Health",
  TRANSIT = "Transit",
  RETAIL = "Retail",
  GIFTS = "Gifts",
  DINING = "Dining",
  SETTLEMENT = "Settlement"
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export type SplitType = "EVEN" | "PERCENTAGE" | "EXACT" | "NONE";

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string;
  paidBy: string; // User ID
  splitType: SplitType;
  splitDetails: {
    [userId: string]: number; // Percentage or Amount based on splitType
  };
  notes?: string;
}

export interface Budget {
  category: Category;
  target: number;
}
