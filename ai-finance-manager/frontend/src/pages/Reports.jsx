import { useEffect, useState, useCallback } from "react";
import { FiDownload, FiFileText } from "react-icons/fi";
import Layout from "../components/Layout";
import Loader from "../components/Loader";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { formatCurrency, formatDate } from "../utils/format";

const PERIODS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export default function Reports() {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [period, setPeriod] = useState("monthly");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/${period}`);
      setReport(res.data);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const download = async (format) => {
    const res = await api.get(`/reports/${period}/${format}`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${period}_report.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Layout title="Reports">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-5">
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={period === p.value ? "nav-link-active" : "nav-link bg-white/5"}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => download("csv")}>
            <FiDownload size={15} /> CSV
          </button>
          <button className="btn-secondary" onClick={() => download("pdf")}>
            <FiFileText size={15} /> PDF
          </button>
        </div>
      </div>

      {loading || !report ? (
        <Loader />
      ) : (
        <div className="space-y-5">
          <div className="glass-panel p-5">
            <p className="text-sm text-mist-400 mb-1">
              {formatDate(report.start_date)} — {formatDate(report.end_date)}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-mist-400">Total Income</p>
                <p className="text-xl font-display font-semibold text-pulse">
                  {formatCurrency(report.total_income, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-mist-400">Total Expense</p>
                <p className="text-xl font-display font-semibold text-coral">
                  {formatCurrency(report.total_expense, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-mist-400">Net Savings</p>
                <p className="text-xl font-display font-semibold text-gold">
                  {formatCurrency(report.net_savings, currency)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass-panel p-5">
              <h3 className="font-display font-semibold text-mist-100 mb-4">Expense Breakdown</h3>
              {report.expense_breakdown.length === 0 ? (
                <p className="text-mist-400 text-sm py-6 text-center">No expenses in this period.</p>
              ) : (
                <ul className="space-y-3">
                  {report.expense_breakdown.map((row, i) => (
                    <li key={i} className="flex justify-between text-sm">
                      <span className="text-mist-100">{row.category}</span>
                      <span className="text-coral font-medium">{formatCurrency(row.amount, currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="glass-panel p-5">
              <h3 className="font-display font-semibold text-mist-100 mb-4">Income Breakdown</h3>
              {report.income_breakdown.length === 0 ? (
                <p className="text-mist-400 text-sm py-6 text-center">No income in this period.</p>
              ) : (
                <ul className="space-y-3">
                  {report.income_breakdown.map((row, i) => (
                    <li key={i} className="flex justify-between text-sm">
                      <span className="text-mist-100">{row.category}</span>
                      <span className="text-pulse font-medium">{formatCurrency(row.amount, currency)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
