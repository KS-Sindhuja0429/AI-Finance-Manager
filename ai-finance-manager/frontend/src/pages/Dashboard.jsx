import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Pie, Bar, Line } from "react-chartjs-2";
import {
  FiArrowUpRight,
  FiArrowDownRight,
  FiTrendingUp,
  FiCreditCard,
  FiActivity,
  FiShield,
  FiAlertTriangle,
} from "react-icons/fi";
import Layout from "../components/Layout";
import Loader from "../components/Loader";
import StatCard from "../components/StatCard";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { formatCurrency, formatDate, MONTH_NAMES } from "../utils/format";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

const PALETTE = ["#2DD4BF", "#F5B14C", "#FB7185", "#818CF8", "#38BDF8", "#FACC15", "#A78BFA", "#34D399"];

export default function Dashboard() {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [anomalies, setAnomalies] = useState(null);
  const [anomaliesLoading, setAnomaliesLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get("/dashboard/summary")
      .then((res) => mounted && setData(res.data))
      .finally(() => mounted && setLoading(false));
    api
      .get("/ml/anomaly-detection")
      .then((res) => mounted && setAnomalies(res.data))
      .catch(() => mounted && setAnomalies(null))
      .finally(() => mounted && setAnomaliesLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading || !data) {
    return (
      <Layout title="Dashboard">
        <Loader />
      </Layout>
    );
  }

  const pieData = {
    labels: data.expense_by_category.map((c) => c.category),
    datasets: [
      {
        data: data.expense_by_category.map((c) => c.amount),
        backgroundColor: PALETTE,
        borderWidth: 0,
      },
    ],
  };

  const trendLabels = data.monthly_trend.map((m) => MONTH_NAMES[m.month - 1]);
  const incomeVsExpense = {
    labels: trendLabels,
    datasets: [
      { label: "Income", data: data.monthly_trend.map((m) => m.income), backgroundColor: "#2DD4BF" },
      { label: "Expense", data: data.monthly_trend.map((m) => m.expense), backgroundColor: "#FB7185" },
    ],
  };

  const trendLine = {
    labels: trendLabels,
    datasets: [
      {
        label: "Net",
        data: data.monthly_trend.map((m) => m.income - m.expense),
        borderColor: "#F5B14C",
        backgroundColor: "rgba(245,177,76,0.15)",
        tension: 0.35,
        fill: true,
        pointRadius: 3,
      },
    ],
  };

  const chartTextColor = "#7C89A3";
  const commonOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: "#DCE2EE" } } },
    scales: {
      x: { ticks: { color: chartTextColor }, grid: { color: "rgba(255,255,255,0.04)" } },
      y: { ticks: { color: chartTextColor }, grid: { color: "rgba(255,255,255,0.04)" } },
    },
  };

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={FiArrowUpRight} label="Total Income" value={formatCurrency(data.total_income, currency)} accent="pulse" delay={0} />
          <StatCard icon={FiArrowDownRight} label="Total Expense" value={formatCurrency(data.total_expense, currency)} accent="coral" delay={0.05} />
          <StatCard icon={FiTrendingUp} label="Net Savings" value={formatCurrency(data.net_savings, currency)} accent="gold" delay={0.1} />
          <StatCard icon={FiCreditCard} label="Total Balance" value={formatCurrency(data.total_balance, currency)} accent="mist" delay={0.15} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StatCard icon={FiActivity} label="Monthly Cash Flow" value={formatCurrency(data.month_cash_flow, currency)} sub="This month" accent="pulse" />
          <StatCard icon={FiArrowUpRight} label="This Month's Income" value={formatCurrency(data.month_income, currency)} accent="pulse" />
          <StatCard icon={FiArrowDownRight} label="This Month's Expense" value={formatCurrency(data.month_expense, currency)} accent="coral" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass-panel p-5 lg:col-span-1 flex flex-col items-center justify-center">
            <span className="text-sm text-mist-400 mb-2">Financial Health Score</span>
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg width="144" height="144" className="-rotate-90">
                <circle cx="72" cy="72" r="60" stroke="rgba(255,255,255,0.08)" strokeWidth="12" fill="none" />
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  stroke="#2DD4BF"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 60}
                  strokeDashoffset={2 * Math.PI * 60 * (1 - data.financial_health_score / 100)}
                />
              </svg>
              <span className="absolute font-display font-bold text-3xl text-mist-100">
                {data.financial_health_score}
              </span>
            </div>
            <p className="text-xs text-mist-400 mt-2 text-center">
              Based on savings rate &amp; budget adherence
            </p>
          </div>

          <div className="glass-panel p-5 lg:col-span-2">
            <h3 className="font-display font-semibold text-mist-100 mb-4">Expense Breakdown</h3>
            {data.expense_by_category.length > 0 ? (
              <div className="max-w-xs mx-auto">
                <Pie data={pieData} options={{ plugins: { legend: { labels: { color: "#DCE2EE" } } } }} />
              </div>
            ) : (
              <p className="text-mist-400 text-sm py-8 text-center">No expenses recorded yet.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-panel p-5">
            <h3 className="font-display font-semibold text-mist-100 mb-4">Income vs Expense</h3>
            <Bar data={incomeVsExpense} options={commonOptions} />
          </div>
          <div className="glass-panel p-5">
            <h3 className="font-display font-semibold text-mist-100 mb-4">Monthly Trend (Net)</h3>
            <Line data={trendLine} options={commonOptions} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-panel p-5">
            <h3 className="font-display font-semibold text-mist-100 mb-4">Recent Transactions</h3>
            {data.recent_transactions.length === 0 ? (
              <p className="text-mist-400 text-sm py-6 text-center">No transactions yet.</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {data.recent_transactions.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-mist-100">
                        {t.category_name || "Uncategorized"}
                      </p>
                      <p className="text-xs text-mist-400">
                        {formatDate(t.date)} {t.notes ? `· ${t.notes}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        t.type === "income" ? "text-pulse" : "text-coral"
                      }`}
                    >
                      {t.type === "income" ? "+" : "-"}
                      {formatCurrency(t.amount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="glass-panel p-5">
            <h3 className="font-display font-semibold text-mist-100 mb-4">Budget Progress</h3>
            {data.budget_progress.length === 0 ? (
              <p className="text-mist-400 text-sm py-6 text-center">
                No budgets set for this month.
              </p>
            ) : (
              <div className="space-y-4">
                {data.budget_progress.map((b, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-mist-100">{b.category_name}</span>
                      <span className="text-mist-400">
                        {formatCurrency(b.spent, currency)} / {formatCurrency(b.limit_amount, currency)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          b.percent_used > 100 ? "bg-coral" : "bg-pulse"
                        }`}
                        style={{ width: `${Math.min(b.percent_used, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {data.goals.length > 0 && (
          <div className="glass-panel p-5">
            <h3 className="font-display font-semibold text-mist-100 mb-4">Savings Goals</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.goals.map((g) => (
                <div key={g.id} className="bg-white/5 rounded-xl p-4">
                  <p className="text-sm font-medium text-mist-100 mb-1">{g.name}</p>
                  <p className="text-xs text-mist-400 mb-2">
                    {formatCurrency(g.current_amount, currency)} of {formatCurrency(g.target_amount, currency)}
                  </p>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full bg-gold rounded-full" style={{ width: `${g.progress_percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="glass-panel p-5">
          <div className="flex items-center gap-2 mb-1">
            <FiShield className="text-pulse" size={18} />
            <h3 className="font-display font-semibold text-mist-100">Unusual Activity (AI-detected)</h3>
          </div>
          <p className="text-xs text-mist-400 mb-4">
            An autoencoder neural network trained on your own spending pattern flags transactions
            that don't look like your normal behavior.
          </p>

          {anomaliesLoading ? (
            <Loader />
          ) : !anomalies ? (
            <p className="text-mist-400 text-sm py-6 text-center">
              Anomaly detection is unavailable right now.
            </p>
          ) : anomalies.insufficient_data ? (
            <p className="text-mist-400 text-sm py-6 text-center">{anomalies.message}</p>
          ) : anomalies.anomaly_count === 0 ? (
            <p className="text-mist-300 text-sm py-6 text-center">
              Nothing unusual — your last {anomalies.transaction_count} expense transactions all
              match your normal pattern.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {anomalies.anomalies.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <div className="flex items-start gap-2">
                    <FiAlertTriangle className="text-gold mt-0.5 shrink-0" size={14} />
                    <div>
                      <p className="text-sm font-medium text-mist-100">
                        {a.category_name || "Uncategorized"}
                      </p>
                      <p className="text-xs text-mist-400">
                        {formatDate(a.date)} {a.notes ? `· ${a.notes}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-coral">
                    {formatCurrency(a.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}
