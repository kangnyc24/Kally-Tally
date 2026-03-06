import { Category, Expense, User, Budget } from "./types";

export const USERS: User[] = [
  {
    id: "user1",
    name: "Al",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Al",
    color: "#5CC5A7"
  },
  {
    id: "user2",
    name: "Janeth",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Janeth",
    color: "#F27D26"
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: "1",
    amount: 85.50,
    category: Category.GROCERIES,
    description: "Weekly shop at Whole Foods",
    date: new Date(2026, 2, 1, 14, 30).toISOString(),
    paidBy: "user1",
    splitType: "EVEN",
    splitDetails: { user1: 50, user2: 50 }
  },
  {
    id: "2",
    amount: 45.00,
    category: Category.DINING,
    description: "Pizza night",
    date: new Date(2026, 2, 2, 19, 15).toISOString(),
    paidBy: "user2",
    splitType: "EVEN",
    splitDetails: { user1: 50, user2: 50 }
  },
  {
    id: "3",
    amount: 120.00,
    category: Category.RETAIL,
    description: "New coffee maker",
    date: new Date(2026, 2, 4, 11, 0).toISOString(),
    paidBy: "user1",
    splitType: "PERCENTAGE",
    splitDetails: { user1: 60, user2: 40 }
  },
  {
    id: "4",
    amount: 15.00,
    category: Category.TRANSIT,
    description: "Uber to station",
    date: new Date(2026, 2, 5, 8, 45).toISOString(),
    paidBy: "user2",
    splitType: "EXACT",
    splitDetails: { user1: 10, user2: 5 }
  }
];

export const INITIAL_BUDGETS: Budget[] = [
  { category: Category.GROCERIES, target: 500 },
  { category: Category.DINING, target: 300 },
  { category: Category.TRANSIT, target: 150 },
  { category: Category.RETAIL, target: 200 },
  { category: Category.HEALTH, target: 100 },
  { category: Category.GIFTS, target: 100 },
  { category: Category.MISC, target: 100 }
];
