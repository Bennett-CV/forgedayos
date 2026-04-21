import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { format, subMonths, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import MonthlyOverview from "../components/finance/MonthlyOverview";
import BudgetCategoryBar from "../components/finance/BudgetCategoryBar";
import TransactionList from "../components/finance/TransactionList";
import AddTransactionDrawer from "../components/finance/AddTransactionDrawer";
import ManageCategoriesDrawer from "../components/finance/ManageCategoriesDrawer";

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
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-slide-up max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-foreground">Finance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Budget & spending tracker</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setManageOpen(true)} className="min-h-[44px] min-w-[44px]">
            <Settings2 className="h-4 w-4" />
          </Button>
          <Button onClick={() => setAddOpen(true)} className="gap-2 min-h-[44px]">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 rounded-lg hover:bg-secondary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-bold">{isCurrentMonth ? "This Month" : displayMonth}</p>
          <p className="text-xs text-muted-foreground">{displayMonth}</p>
        </div>
        <button
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          disabled={isCurrentMonth}
          className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-30 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Overview cards */}
      <MonthlyOverview
        totalIncome={totalIncome}
        totalExpenses={totalExpenses}
        totalBudgeted={totalBudgeted}
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-secondary/50 p-1 border border-border">
        {[
          { id: "overview", label: "Budget" },
          { id: "transactions", label: "Transactions" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Budget Tab */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {expenseCategories.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Expenses</p>
              {expenseCategories.map(cat => (
                <BudgetCategoryBar key={cat.id} category={cat} spent={spentByCategory[cat.id] || 0} onUpdated={load} />
              ))}
            </div>
          )}

          {incomeCategories.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Income Sources</p>
              {incomeCategories.map(cat => (
                <BudgetCategoryBar key={cat.id} category={cat} onUpdated={load} spent={
                  transactions.filter(t => t.type === "income" && t.category_id === cat.id).reduce((s, t) => s + t.amount, 0)
                } />
              ))}
            </div>
          )}

          {categories.length === 0 && (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground mb-2">No budget categories yet.</p>
              <Button variant="outline" onClick={() => setManageOpen(true)} className="gap-2">
                <Settings2 className="h-4 w-4" /> Set Up Budget
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === "transactions" && (
        <TransactionList transactions={transactions} onDeleted={load} />
      )}

      <AddTransactionDrawer open={addOpen} onClose={() => setAddOpen(false)} onAdded={load} categories={categories} />
      <ManageCategoriesDrawer open={manageOpen} onClose={() => setManageOpen(false)} categories={categories} onChanged={load} />
    </div>
  );
}