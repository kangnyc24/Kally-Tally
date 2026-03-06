/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  LayoutDashboard, 
  PieChart, 
  ShoppingBasket, 
  Coffee, 
  Heart, 
  Car, 
  ShoppingBag, 
  Gift, 
  Utensils,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  LogOut,
  User as UserIcon,
  X,
  Check,
  Banknote,
  BarChart3,
  List,
  Coins,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Category, Expense, User, Budget, SplitType } from './types';
import { USERS, INITIAL_EXPENSES, INITIAL_BUDGETS } from './mockData';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy,
  setDoc,
  getDoc
} from 'firebase/firestore';

// --- Components ---

const CategoryIcon = ({ category, className = "" }: { category: Category, className?: string }) => {
  switch (category) {
    case Category.GROCERIES: return <ShoppingBasket className={className} />;
    case Category.DINING: return <Utensils className={className} />;
    case Category.HEALTH: return <Heart className={className} />;
    case Category.TRANSIT: return <Car className={className} />;
    case Category.RETAIL: return <ShoppingBag className={className} />;
    case Category.GIFTS: return <Gift className={className} />;
    case Category.MISC: return <Coffee className={className} />;
    case Category.SETTLEMENT: return <Banknote className={className} />;
    default: return <Plus className={className} />;
  }
};

const ProgressBar = ({ current, target, color }: { current: number, target: number, color: string }) => {
  const percentage = Math.min(Math.round((current / target) * 100), 100);
  const isOver = current > target;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs font-medium mb-1">
        <span className="text-slate-500">${current.toFixed(0)} / ${target}</span>
        <span className={isOver ? "text-red-500" : "text-slate-400"}>{percentage}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: isOver ? "#EF4444" : color }}
        />
      </div>
    </div>
  );
};

interface BudgetCardProps {
  budget: Budget;
  currentSpending: number;
  onUpdate: (target: number) => void;
  key?: React.Key;
}

const BudgetCard = ({ budget, currentSpending, onUpdate }: BudgetCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempTarget, setTempTarget] = useState(budget.target.toString());

  const handleSave = () => {
    const val = parseFloat(tempTarget);
    if (!isNaN(val) && val >= 0) {
      onUpdate(val);
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
            <CategoryIcon category={budget.category} />
          </div>
          <span className="font-bold text-slate-800">{budget.category}</span>
        </div>
        
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input 
              type="number"
              value={tempTarget}
              onChange={(e) => setTempTarget(e.target.value)}
              className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#5CC5A7]/20"
              autoFocus
            />
            <button onClick={handleSave} className="p-1 text-[#5CC5A7] hover:bg-emerald-50 rounded-md">
              <Check size={18} />
            </button>
            <button onClick={() => setIsEditing(false)} className="p-1 text-slate-400 hover:bg-slate-50 rounded-md">
              <X size={18} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setIsEditing(true)}
            className="text-xs font-semibold text-[#5CC5A7] bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            Edit Target
          </button>
        )}
      </div>
      <ProgressBar 
        current={currentSpending} 
        target={budget.target} 
        color="#5CC5A7" 
      />
    </div>
  );
};

const PrintableSummary = ({ expenses, onClose }: { expenses: Expense[], onClose: () => void }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [expenses, selectedMonth, selectedYear]);

  const getShare = (expense: Expense, userId: string) => {
    const share = expense.splitDetails[userId] || 0;
    if (expense.splitType === 'EVEN' || expense.splitType === 'PERCENTAGE') {
      return (expense.amount * share) / 100;
    }
    return share;
  };

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalUser1 = filteredExpenses.reduce((sum, e) => sum + getShare(e, USERS[0].id), 0);
  const totalUser2 = filteredExpenses.reduce((sum, e) => sum + getShare(e, USERS[1].id), 0);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-white z-50 overflow-y-auto p-6"
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8 no-print">
          <h2 className="text-2xl font-bold">Printable Summary</h2>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex gap-4 mb-8 no-print">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-medium"
          >
            {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-medium"
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button 
            onClick={() => window.print()}
            className="ml-auto bg-[#5CC5A7] text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-emerald-100"
          >
            Print / PDF
          </button>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-bottom">
                <th className="p-3 font-bold text-slate-600 border">Date</th>
                <th className="p-3 font-bold text-slate-600 border">Description</th>
                <th className="p-3 font-bold text-slate-600 border">Category</th>
                <th className="p-3 font-bold text-slate-600 border">Paid By</th>
                <th className="p-3 font-bold text-slate-600 border text-right">Total</th>
                <th className="p-3 font-bold text-slate-600 border text-right">{USERS[0].name}</th>
                <th className="p-3 font-bold text-slate-600 border text-right">{USERS[1].name}</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(e => (
                <tr key={e.id} className="border-bottom hover:bg-slate-50">
                  <td className="p-3 border whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="p-3 border">{e.description}</td>
                  <td className="p-3 border">{e.category}</td>
                  <td className="p-3 border">{USERS.find(u => u.id === e.paidBy)?.name}</td>
                  <td className="p-3 border text-right font-mono font-bold">${e.amount.toFixed(2)}</td>
                  <td className="p-3 border text-right font-mono text-slate-600">${getShare(e, USERS[0].id).toFixed(2)}</td>
                  <td className="p-3 border text-right font-mono text-slate-600">${getShare(e, USERS[1].id).toFixed(2)}</td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 italic">
                    No expenses found for this period.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={4} className="p-3 text-right border uppercase tracking-wider text-xs text-slate-400">Monthly Totals</td>
                  <td className="p-3 text-right border font-mono text-lg">${totalAmount.toFixed(2)}</td>
                  <td className="p-3 text-right border font-mono text-slate-600">${totalUser1.toFixed(2)}</td>
                  <td className="p-3 text-right border font-mono text-slate-600">${totalUser2.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="mt-8 p-6 bg-slate-50 rounded-2xl text-sm text-slate-500 no-print">
          <p className="font-bold mb-2">Pro Tip:</p>
          <p>You can select the table above and copy/paste it directly into Excel or Google Sheets. The formatting will be preserved!</p>
        </div>
      </div>
    </motion.div>
  );
};

const SettleUpModal = ({ 
  amount: initialAmount, 
  whoOwes, 
  toWhom, 
  onClose, 
  onSettle 
}: { 
  amount: number, 
  whoOwes: string, 
  toWhom: string, 
  onClose: () => void,
  onSettle: (method: string, amount: number) => void
}) => {
  const [method, setMethod] = useState('Venmo');
  const [settleAmount, setSettleAmount] = useState(initialAmount.toString());
  const methods = ['Venmo', 'Zelle', 'Cash', 'PayPal'];

  const handleConfirm = () => {
    const val = parseFloat(settleAmount);
    if (!isNaN(val) && val > 0) {
      onSettle(method, val);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Settle Up</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Banknote className="text-[#5CC5A7] w-10 h-10" />
          </div>
          <p className="text-slate-500 text-sm mb-2">{whoOwes} is paying {toWhom}</p>
          <div className="relative inline-block">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-slate-400">$</span>
            <input 
              type="number"
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-10 pr-4 py-4 text-4xl font-bold text-slate-900 text-center focus:outline-none focus:border-[#5CC5A7] transition-all"
              step="0.01"
              autoFocus
            />
          </div>
          {parseFloat(settleAmount) !== initialAmount && (
            <p className="text-[10px] text-slate-400 mt-2 italic">
              Original balance: ${initialAmount.toFixed(2)}
            </p>
          )}
        </div>

        <div className="space-y-4 mb-8">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Payment Method</p>
          <div className="grid grid-cols-2 gap-3">
            {methods.map(m => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`py-3 rounded-2xl font-bold text-sm transition-all border ${
                  method === m 
                    ? 'bg-[#5CC5A7] text-white border-[#5CC5A7] shadow-lg shadow-emerald-100' 
                    : 'bg-white text-slate-500 border-slate-100 hover:border-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={handleConfirm}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all"
        >
          Confirm Settlement
        </button>
      </motion.div>
    </motion.div>
  );
};

const BudgetGraph = ({ expenses }: { expenses: Expense[] }) => {
  const [visibleCategories, setVisibleCategories] = useState<string[]>(Object.values(Category));

  const data = useMemo(() => {
    const months = [];
    const now = new Date();
    
    // Show from current month to end of year
    for (let i = 0; i < 12 - now.getMonth(); i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        month: d.toLocaleString('default', { month: 'short' }),
        monthIdx: d.getMonth(),
        year: d.getFullYear(),
        ...Object.values(Category).reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {})
      });
    }

    expenses.forEach(e => {
      const d = new Date(e.date);
      const monthData = months.find(m => m.monthIdx === d.getMonth() && m.year === d.getFullYear());
      if (monthData) {
        (monthData as any)[e.category] += e.amount;
      }
    });

    return months;
  }, [expenses]);

  const colors: Record<string, string> = {
    [Category.GROCERIES]: "#5CC5A7",
    [Category.DINING]: "#F27D26",
    [Category.HEALTH]: "#FF4444",
    [Category.TRANSIT]: "#4A90E2",
    [Category.RETAIL]: "#9B59B6",
    [Category.GIFTS]: "#F1C40F",
    [Category.MISC]: "#95A5A6",
    [Category.SETTLEMENT]: "#2C3E50"
  };

  const toggleCategory = (cat: string) => {
    setVisibleCategories(prev => 
      prev.includes(cat) 
        ? prev.filter(c => c !== cat) 
        : [...prev, cat]
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 h-[350px]">
        <h4 className="text-sm font-bold text-slate-400 mb-6 uppercase tracking-widest">Spending Forecast & Trends</h4>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                padding: '12px'
              }}
            />
            {Object.values(Category).map(cat => (
              <Bar 
                key={cat as string} 
                dataKey={cat as string} 
                stackId="a" 
                fill={colors[cat as string] || "#cbd5e1"} 
                hide={!visibleCategories.includes(cat as string)}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-2 px-2">
        {Object.values(Category).map(cat => (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
              visibleCategories.includes(cat)
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: visibleCategories.includes(cat) ? 'white' : colors[cat] }} 
              />
              {cat}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'add' | 'budget'>('dashboard');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>(INITIAL_BUDGETS);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false);
  const [budgetView, setBudgetView] = useState<'list' | 'graph'>('list');

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
      if (user) {
        // Map Firebase user to our local User object
        const matchedUser = USERS.find(u => u.id === user.uid) || USERS.find(u => u.name.toLowerCase() === user.email?.split('@')[0].toLowerCase());
        if (matchedUser) {
          setCurrentUser({ ...matchedUser, id: user.uid });
        } else {
          // Fallback if not in USERS mock
          setCurrentUser({
            id: user.uid,
            name: user.email?.split('@')[0] || 'User',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
            color: '#5CC5A7'
          });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Firestore listeners
  useEffect(() => {
    if (!fbUser) {
      setExpenses(INITIAL_EXPENSES);
      setBudgets(INITIAL_BUDGETS);
      return;
    }

    // Listen to expenses
    const qExpenses = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      const fetchedExpenses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[];
      setExpenses(fetchedExpenses.length > 0 ? fetchedExpenses : INITIAL_EXPENSES);
    });

    // Listen to budgets
    const unsubBudgets = onSnapshot(collection(db, 'budgets'), (snapshot) => {
      if (!snapshot.empty) {
        const fetchedBudgets = snapshot.docs.map(doc => doc.data() as Budget);
        setBudgets(fetchedBudgets);
      }
    });

    return () => {
      unsubExpenses();
      unsubBudgets();
    };
  }, [fbUser]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setAuthError("Email/Password login is not enabled in your Firebase Console.");
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError("This email is already registered. Try logging in.");
      } else if (err.code === 'auth/weak-password') {
        setAuthError("Password should be at least 6 characters.");
      } else if (err.code === 'auth/invalid-email') {
        setAuthError("Please enter a valid email address.");
      } else {
        setAuthError(err.message || "An error occurred during authentication.");
      }
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  // --- Calculations ---

  const monthlyTotals = useMemo(() => {
    const now = new Date();
    const currentMonthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const totals: Record<string, number> = {};
    Object.values(Category).forEach(cat => {
      totals[cat] = currentMonthExpenses
        .filter(e => e.category === cat)
        .reduce((sum, e) => sum + e.amount, 0);
    });

    return totals;
  }, [expenses]);

  const balance = useMemo(() => {
    // Calculate who owes who
    // user1 paid X, user2 owes Alex Y
    // We sum up all expenses and see the net balance
    let user1OwesUser2 = 0;
    let user2OwesUser1 = 0;

    expenses.forEach(e => {
      const otherUserId = e.paidBy === 'user1' ? 'user2' : 'user1';
      let otherUserOwes = 0;

      if (e.splitType === 'EVEN') {
        otherUserOwes = e.amount / 2;
      } else if (e.splitType === 'PERCENTAGE') {
        const otherUserPercent = e.splitDetails[otherUserId] || 0;
        otherUserOwes = (e.amount * otherUserPercent) / 100;
      } else if (e.splitType === 'EXACT') {
        otherUserOwes = e.splitDetails[otherUserId] || 0;
      }

      if (e.paidBy === 'user1') {
        user2OwesUser1 += otherUserOwes;
      } else {
        user1OwesUser2 += otherUserOwes;
      }
    });

    const diff = user2OwesUser1 - user1OwesUser2;
    const user1 = USERS.find(u => u.id === 'user1');
    const user2 = USERS.find(u => u.id === 'user2');
    
    return {
      amount: Math.abs(diff),
      whoOwes: diff > 0 ? (user2?.name || 'User 2') : (user1?.name || 'User 1'),
      toWhom: diff > 0 ? (user1?.name || 'User 1') : (user2?.name || 'User 2'),
      isEven: Math.abs(diff) < 0.01
    };
  }, [expenses]);

  // --- Handlers ---

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const handleAddExpense = async (newExpense: Omit<Expense, 'id' | 'date'> & { id?: string }) => {
    try {
      if (newExpense.id) {
        // Update existing
        const expenseRef = doc(db, 'expenses', newExpense.id);
        await updateDoc(expenseRef, { ...newExpense });
      } else {
        // Add new
        await addDoc(collection(db, 'expenses'), {
          ...newExpense,
          date: new Date().toISOString()
        });
      }
      setEditingExpense(null);
      setActiveTab('dashboard');
    } catch (err) {
      console.error("Error saving expense:", err);
    }
  };

  const handleSettleUp = async (method: string, settleAmount: number) => {
    if (balance.isEven) return;

    const payer = USERS.find(u => u.name === balance.whoOwes);
    const receiver = USERS.find(u => u.name === balance.toWhom);

    if (!payer || !receiver) return;

    try {
      await addDoc(collection(db, 'expenses'), {
        amount: settleAmount,
        category: Category.SETTLEMENT,
        description: `${payer.name} paid ${receiver.name} via ${method}`,
        date: new Date().toISOString(),
        paidBy: payer.id,
        splitType: 'EXACT',
        splitDetails: {
          [receiver.id]: settleAmount,
          [payer.id]: 0
        }
      });
      setIsSettleUpOpen(false);
    } catch (err) {
      console.error("Error settling up:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-[#5CC5A7] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!fbUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-[#5CC5A7] rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-100">
              <Banknote className="text-white w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">KallyTally</h1>
            <p className="text-slate-500 text-sm">Secure shared expenses for Al & Janeth</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="al@example.com"
                className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5CC5A7]/20 transition-all"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white p-4 rounded-2xl border border-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5CC5A7]/20 transition-all"
                required
              />
            </div>
            
            {authError && (
              <p className="text-red-500 text-[10px] font-medium text-center bg-red-50 p-2 rounded-lg border border-red-100">{authError}</p>
            )}

            <button 
              type="submit"
              className="w-full bg-[#5CC5A7] text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-emerald-500 transition-all active:scale-[0.98] mt-4"
            >
              {isSignUp ? 'Create Account' : 'Log In'}
            </button>
          </form>

          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full mt-6 text-sm font-semibold text-slate-400 hover:text-[#5CC5A7] transition-colors"
          >
            {isSignUp ? 'Already have an account? Log In' : 'Need an account? Sign Up'}
          </button>

          <div className="mt-10 p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
            <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Check className="text-[#5CC5A7]" size={14} />
              How your data is saved
            </h4>
            <ul className="space-y-2">
              <li className="text-[10px] text-slate-500 flex gap-2">
                <div className="w-1 h-1 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                <span><strong>Cloud Sync:</strong> Every expense is saved instantly to a secure Firebase database.</span>
              </li>
              <li className="text-[10px] text-slate-500 flex gap-2">
                <div className="w-1 h-1 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                <span><strong>Persistence:</strong> Your entries stay there forever, even if you close the browser or switch devices.</span>
              </li>
              <li className="text-[10px] text-slate-500 flex gap-2">
                <div className="w-1 h-1 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                <span><strong>Privacy:</strong> Only Al and Janeth can access this ledger with their unique passwords.</span>
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 max-w-md mx-auto relative shadow-2xl shadow-slate-200">
      {/* Header */}
      <header className="p-6 flex justify-between items-center sticky top-0 bg-slate-50/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
          <div>
            <p className="text-xs text-slate-400 font-medium">Welcome back,</p>
            <p className="font-bold text-slate-900">{currentUser.name}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* Main Content */}
      <main className="px-6">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Balance Card */}
              <div className="bg-[#5CC5A7] p-6 rounded-[2rem] text-white shadow-xl shadow-emerald-100 relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-emerald-50/80 text-sm font-medium mb-1">Monthly Balance</p>
                  <h2 className="text-4xl font-bold mb-4">
                    {balance.isEven ? "$0.00" : `$${balance.amount.toFixed(2)}`}
                  </h2>
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full w-fit text-sm font-medium">
                    {balance.isEven ? (
                      <span>You're all settled up!</span>
                    ) : (
                      <>
                        <span className="opacity-80">{balance.whoOwes} owes</span>
                        <span className="font-bold">{balance.toWhom}</span>
                      </>
                    )}
                  </div>
                  {!balance.isEven && (
                    <button 
                      onClick={() => setIsSettleUpOpen(true)}
                      className="mt-4 bg-white text-[#5CC5A7] px-6 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-emerald-50 transition-all flex items-center gap-2"
                    >
                      <Check size={16} />
                      Settle Up
                    </button>
                  )}
                </div>
                {/* Decorative circles */}
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full" />
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/5 rounded-full" />
              </div>

              {/* Recent Expenses */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-900">Recent Activity</h3>
                  <button 
                    onClick={() => setIsSummaryOpen(true)}
                    className="text-xs font-semibold text-[#5CC5A7] hover:underline flex items-center gap-1"
                  >
                    Printable Summary
                  </button>
                </div>
                <div className="space-y-3">
                  {expenses.slice(0, 10).map((expense) => (
                    <button 
                      key={expense.id} 
                      onClick={() => {
                        setEditingExpense(expense);
                        setActiveTab('add');
                      }}
                      className="w-full text-left bg-white p-4 rounded-2xl flex items-center shadow-sm border border-slate-100 hover:border-emerald-200 transition-all active:scale-[0.98]"
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 mr-4">
                        <CategoryIcon category={expense.category} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800 leading-tight">{expense.description}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {expense.category} • Paid by {USERS.find(u => u.id === expense.paidBy)?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-900">${expense.amount.toFixed(2)}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-tighter">
                          {new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'add' && (
            <motion.div
              key="add"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ExpenseForm 
                onSubmit={handleAddExpense} 
                currentUser={currentUser} 
                initialData={editingExpense}
                onCancel={() => {
                  setEditingExpense(null);
                  setActiveTab('dashboard');
                }}
              />
            </motion.div>
          )}

          {activeTab === 'budget' && (
            <motion.div
              key="budget"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900">Budget Tracking</h3>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setBudgetView('list')}
                    className={`p-2 rounded-lg transition-all ${budgetView === 'list' ? 'bg-white shadow-sm text-[#5CC5A7]' : 'text-slate-400'}`}
                  >
                    <List size={18} />
                  </button>
                  <button 
                    onClick={() => setBudgetView('graph')}
                    className={`p-2 rounded-lg transition-all ${budgetView === 'graph' ? 'bg-white shadow-sm text-[#5CC5A7]' : 'text-slate-400'}`}
                  >
                    <BarChart3 size={18} />
                  </button>
                </div>
              </div>

              {budgetView === 'list' ? (
                <div className="grid gap-4">
                  {budgets.map(budget => (
                    <BudgetCard 
                      key={budget.category} 
                      budget={budget} 
                      currentSpending={monthlyTotals[budget.category] || 0}
                      onUpdate={async (newTarget) => {
                        try {
                          const budgetRef = doc(db, 'budgets', budget.category);
                          await setDoc(budgetRef, { ...budget, target: newTarget });
                        } catch (err) {
                          console.error("Error updating budget:", err);
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                <BudgetGraph expenses={expenses} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}

      <AnimatePresence>
        {isSummaryOpen && (
          <PrintableSummary 
            expenses={expenses} 
            onClose={() => setIsSummaryOpen(false)} 
          />
        )}
        {isSettleUpOpen && (
          <SettleUpModal 
            amount={balance.amount}
            whoOwes={balance.whoOwes}
            toWhom={balance.toWhom}
            onClose={() => setIsSettleUpOpen(false)}
            onSettle={handleSettleUp}
          />
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/80 backdrop-blur-xl border-t border-slate-100 px-8 py-4 flex justify-between items-center safe-area-bottom z-20">
        <NavButton 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
          icon={<LayoutDashboard size={24} />} 
          label="Home"
        />
        <button 
          onClick={() => setActiveTab('add')}
          className="w-14 h-14 bg-[#5CC5A7] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 -mt-12 border-4 border-white transition-transform active:scale-95"
        >
          <Plus size={32} />
        </button>
        <NavButton 
          active={activeTab === 'budget'} 
          onClick={() => setActiveTab('budget')} 
          icon={<PieChart size={24} />} 
          label="Budget"
        />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-[#5CC5A7]' : 'text-slate-400'}`}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function ExpenseForm({ 
  onSubmit, 
  currentUser, 
  initialData,
  onCancel
}: { 
  onSubmit: (e: any) => void, 
  currentUser: User,
  initialData?: Expense | null,
  onCancel?: () => void
}) {
  const [amount, setAmount] = useState(initialData?.amount.toString() || '');
  const [category, setCategory] = useState<Category>(initialData?.category || Category.GROCERIES);
  const [description, setDescription] = useState(initialData?.description || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [splitType, setSplitType] = useState<SplitType>(initialData?.splitType || 'EVEN');
  
  const initialSplitValue = useMemo(() => {
    if (!initialData) return 50;
    const otherUserId = initialData.paidBy === 'user1' ? 'user2' : 'user1';
    return initialData.splitDetails[otherUserId] || 0;
  }, [initialData]);

  const [splitValue, setSplitValue] = useState<number>(initialSplitValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    const numAmount = parseFloat(amount);
    const otherUserId = currentUser.id === 'user1' ? 'user2' : 'user1';
    
    let splitDetails: Record<string, number> = {};
    if (splitType === 'EVEN') {
      splitDetails = { user1: 50, user2: 50 };
    } else if (splitType === 'PERCENTAGE') {
      splitDetails = {
        [currentUser.id]: 100 - splitValue,
        [otherUserId]: splitValue
      };
    } else if (splitType === 'EXACT') {
      splitDetails = {
        [currentUser.id]: numAmount - splitValue,
        [otherUserId]: splitValue
      };
    } else if (splitType === 'NONE') {
      splitDetails = {
        [currentUser.id]: numAmount,
        [otherUserId]: 0
      };
    }

    onSubmit({
      id: initialData?.id,
      amount: numAmount,
      category,
      description,
      notes,
      paidBy: initialData?.paidBy || currentUser.id,
      splitType,
      splitDetails
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div className="text-left">
          <h2 className="text-2xl font-bold text-slate-900">{initialData ? 'Edit Expense' : 'Add Expense'}</h2>
          <p className="text-slate-400 text-sm">{initialData ? 'Update the details below' : 'Fill in the details below'}</p>
        </div>
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel}
            className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Amount */}
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-300">$</span>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-white p-6 pl-10 rounded-3xl text-4xl font-bold text-slate-900 border border-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5CC5A7]/20 transition-all"
            autoFocus
          />
        </div>

        {/* Description */}
        <input
          type="text"
          placeholder="What was it for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-white p-4 rounded-2xl text-lg font-medium text-slate-700 border border-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5CC5A7]/20 transition-all"
        />

        {/* Notes */}
        <div className="relative">
          <div className="absolute left-4 top-4 text-slate-300">
            <FileText size={20} />
          </div>
          <textarea
            placeholder="Add optional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-white p-4 pl-12 rounded-2xl text-sm font-medium text-slate-600 border border-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5CC5A7]/20 transition-all resize-none"
          />
        </div>

        {/* Category */}
        <div className="grid grid-cols-4 gap-2">
          {Object.values(Category).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`p-3 rounded-2xl flex flex-col items-center gap-1 transition-all border ${
                category === cat 
                  ? 'bg-[#5CC5A7] text-white border-[#5CC5A7] shadow-lg shadow-emerald-100' 
                  : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
              }`}
            >
              <CategoryIcon category={cat} className="w-5 h-5" />
              <span className="text-[10px] font-bold truncate w-full text-center">{cat}</span>
            </button>
          ))}
        </div>

        {/* Splitting Logic */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-700">Split Method</span>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {(['EVEN', 'PERCENTAGE', 'EXACT', 'NONE'] as SplitType[]).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    splitType === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  {type === 'NONE' ? 'NO SPLIT' : type}
                </button>
              ))}
            </div>
          </div>

          {(splitType === 'PERCENTAGE' || splitType === 'EXACT') && (
            <div className="pt-2">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                <span>{USERS.find(u => u.id !== currentUser.id)?.name}'s share</span>
                <span>{splitType === 'PERCENTAGE' ? `${splitValue}%` : `$${splitValue}`}</span>
              </div>
              <input
                type="range"
                min="0"
                max={splitType === 'PERCENTAGE' ? 100 : (parseFloat(amount) || 100)}
                step={splitType === 'PERCENTAGE' ? 1 : 0.01}
                value={splitValue}
                onChange={(e) => setSplitValue(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#5CC5A7]"
              />
            </div>
          )}

          {splitType === 'NONE' && (
            <div className="pt-2 text-center">
              <p className="text-xs font-medium text-slate-500 bg-slate-50 py-2 rounded-xl border border-dashed border-slate-200">
                You are paying the full amount yourself.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 p-3 rounded-xl">
            <UserIcon size={14} />
            <span>Paid by <span className="font-bold text-slate-600">{currentUser.name}</span></span>
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-[#5CC5A7] p-5 rounded-3xl text-white font-bold text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-500 transition-all active:scale-[0.98]"
      >
        Save Expense
      </button>
    </form>
  );
}

