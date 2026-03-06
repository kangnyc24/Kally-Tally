# KallyTally Database Schema

This document outlines the schema required for a Firebase (Firestore) or Supabase (PostgreSQL) backend to support the KallyTally application.

## 1. Firebase Firestore Schema

Firestore is a NoSQL document database. We recommend the following structure:

### Collection: `expenses`
Each document represents a single transaction.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Auto-generated document ID |
| `amount` | `number` | Total cost of the expense |
| `category` | `string` | One of: Groceries, Misc, Health, Transit, Retail, Gifts, Dining |
| `description` | `string` | User-provided text descriptor |
| `date` | `timestamp` | Server timestamp of when the expense was created |
| `paidBy` | `string` | UID of the user who paid |
| `splitType` | `string` | EVEN, PERCENTAGE, or EXACT |
| `splitDetails` | `map` | Map of `userId: value` (e.g., `{ "user1": 50, "user2": 50 }`) |

### Collection: `budgets`
Each document represents a monthly target for a category.

| Field | Type | Description |
| :--- | :--- | :--- |
| `category` | `string` | The category name (Primary Key or unique field) |
| `target` | `number` | The monthly budget limit |
| `updatedAt` | `timestamp` | Last time the budget was modified |

### Collection: `users`
Basic user profiles.

| Field | Type | Description |
| :--- | :--- | :--- |
| `uid` | `string` | Firebase Auth UID |
| `displayName` | `string` | User's name |
| `photoURL` | `string` | Avatar image URL |

---

## 2. Supabase (PostgreSQL) Schema

Supabase uses a relational database. Here are the SQL definitions:

### Table: `expenses`
```sql
CREATE TABLE expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  amount DECIMAL(10, 2) NOT NULL,
  category TEXT CHECK (category IN ('Groceries', 'Misc', 'Health', 'Transit', 'Retail', 'Gifts', 'Dining')),
  description TEXT NOT NULL,
  date TIMESTAMPTZ DEFAULT NOW(),
  paid_by UUID REFERENCES auth.users(id),
  split_type TEXT CHECK (split_type IN ('EVEN', 'PERCENTAGE', 'EXACT')),
  split_details JSONB NOT NULL -- Stores { "userId": value }
);
```

### Table: `budgets`
```sql
CREATE TABLE budgets (
  category TEXT PRIMARY KEY,
  target DECIMAL(10, 2) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: `profiles`
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT
);
```

## Implementation Notes
- **Real-time**: Use `onSnapshot` (Firebase) or `supabase.channel()` to listen for changes in the `expenses` table.
- **Aggregation**: For the "Who owes who" logic, you can use a database function or calculate it client-side by summing the `split_details` for the current month.
