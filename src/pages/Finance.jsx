import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, subMonths, addMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import MonthlyOverview from "../components/finance/MonthlyOverview";
import BudgetCategoryBar from "../components/finance/BudgetCategoryBar";
import TransactionList from "../components/finance/TransactionList";
import AddTransactionDrawer from "../components/finance/AddTransactionDrawer";
import ManageCategoriesDrawer from "../components/finance/ManageCategoriesDrawer";
import SpendingTrends from "../components/finance/SpendingTrends";

export default function Finance() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const monthKey = format(currentMonth, "yyyy-MM");
  const displayMonth = format(currentMonth, "MMMM yyyy");
  const isCurrentMonth = monthKey === format(new Date(), "yyyy-MM");

  const load = async () => {
    if (!user?.email) return;
    const [txns, cats] = await Promise.all([
      base44.entities.Transaction.filter({ month: monthKey, created_by: user.email }),
      base44.entities.BudgetCategory.filter({ created_by: user.email }),
    ]);
    setTransactions(txns);
    setCategories(cats);
    setLoading(false);
  };

  useEffect(() => { setLoading(true); load(); }, [monthKey]);

  // Aggregations
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalBudgeted = categories.filter(c => c.type === "expense").reduce((s, c) => s + c.budget_amount, 0);

  const spentByCategory = {};
  transactions.filter(t => t.type === "expense").forEach(t => {
    if (t.category_id) spentByCategory[t.category_id] = (spentByCategory[t.category_id] || 0) + t.amount;
  });

  const expenseCategories = categories.filter(c => c.type === "expense");
  const incomeCategories = categories.filter(c => c.type === "income");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-border border-t-clay rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Finance</h1>
          <p className="text-sm text-caption mt-0.5">Budget & spending</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setManageOpen(true)} className="min-h-[44px] text-[12px] font-semibold">
            Categories
          </Button>
          <Button onClick={() => setAddOpen(true)} className="min-h-[44px] bg-clay text-clay-fg hover:bg-clay-hover">
            Add
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between editorial-card px-3 py-2">
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="text-[13px] font-semibold text-caption min-w-[44px]">
          Prev
        </button>
        <div className="text-center">
          <p className="text-[13px] font-semibold text-ink">{isCurrentMonth ? "This Month" : displayMonth}</p>
          <p className="text-[11px] text-caption">{displayMonth}</p>
        </div>
        <button
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          disabled={isCurrentMonth}
          className="text-[13px] font-semibold text-caption min-w-[44px] disabled:opacity-30"
        >
          Next
        </button>
      </div>

      {/* Overview cards */}
      <MonthlyOverview
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        totalBudgeted={totalBudgeted}
      />

      {/* Tabs */}
      <div className="seg-track">
        {[
          { id: "overview", label: "Budget" },
          { id: "transactions", label: "Transactions" },
          { id: "trends", label: "Trends" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`seg-item text-[12px] ${activeTab === tab.id ? "seg-item-active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Budget Tab */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {expenseCategories.length > 0 && (
            <div className="editorial-card p-5 space-y-5">
              <p className="micro-label">Expenses</p>
              {expenseCategories.map(cat => (
                <BudgetCategoryBar key={cat.id} category={cat} spent={spentByCategory[cat.id] || 0} onUpdated={load} />
              ))}
            </div>
          )}

          {incomeCategories.length > 0 && (
            <div className="editorial-card p-5 space-y-5">
              <p className="micro-label">Income Sources</p>
              {incomeCategories.map(cat => (
                <BudgetCategoryBar key={cat.id} category={cat} onUpdated={load} spent={
                  transactions.filter(t => t.type === "income" && t.category_id === cat.id).reduce((s, t) => s + t.amount, 0)
                } />
              ))}
            </div>
          )}

          {categories.length === 0 && (
            <div className="text-center py-12 editorial-card border-dashed">
              <p className="text-sm text-caption mb-2">No budget categories yet.</p>
              <Button variant="outline" onClick={() => setManageOpen(true)}>
                Set Up Budget
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === "transactions" && (
        <TransactionList transactions={transactions} onDeleted={load} />
      )}

      {/* Trends Tab */}
      {activeTab === "trends" && <SpendingTrends />}

      <AddTransactionDrawer open={addOpen} onClose={() => setAddOpen(false)} onAdded={load} categories={categories} />
      <ManageCategoriesDrawer open={manageOpen} onClose={() => setManageOpen(false)} categories={categories} onChanged={load} />
    </div>
  );
}