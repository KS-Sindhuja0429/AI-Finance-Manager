import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FiPlus, FiTrash2, FiAlertTriangle, FiZap } from "react-icons/fi";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import Loader from "../components/Loader";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { formatCurrency, MONTH_NAMES } from "../utils/format";

const today = new Date();

export default function Budgets() {
  const { user } = useAuth();
  const currency = user?.currency || "USD";

  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [budRes, catRes, recRes] = await Promise.all([
        api.get("/budgets", { params: { month, year } }),
        api.get("/categories"),
        api.get("/budgets/recommendations"),
      ]);
      setBudgets(budRes.data.budgets);
      setCategories(catRes.data.categories.filter((c) => c.type === "expense"));
      setRecommendations(recRes.data.recommendations);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    reset({ category_id: "", month, year, limit_amount: "" });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await api.post("/budgets", {
        ...data,
        category_id: data.category_id || null,
        month: parseInt(data.month),
        year: parseInt(data.year),
        limit_amount: parseFloat(data.limit_amount),
      });
      toast.success("Budget created");
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this budget?")) return;
    try {
      await api.delete(`/budgets/${id}`);
      toast.success("Budget deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  const categoryName = (id) => categories.find((c) => c.id === id)?.name;

  return (
    <Layout title="Budgets">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-5">
        <div className="flex gap-3">
          <select className="glass-input w-auto" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select className="glass-input w-auto" value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <FiPlus size={16} /> Add Budget
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="space-y-6">
          {budgets.length === 0 ? (
            <p className="text-mist-400 text-sm py-8 text-center glass-panel">
              No budgets set for this month yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {budgets.map((b) => (
                <div key={b.id} className="glass-panel p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-mist-100">{b.category_name}</p>
                      {b.overspent && <FiAlertTriangle className="text-coral" size={15} />}
                    </div>
                    <button onClick={() => handleDelete(b.id)} className="text-mist-400 hover:text-coral">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-mist-300">
                      {formatCurrency(b.spent, currency)} spent
                    </span>
                    <span className="text-mist-400">of {formatCurrency(b.limit_amount, currency)}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${b.overspent ? "bg-coral" : "bg-pulse"}`}
                      style={{ width: `${Math.min(b.percent_used, 100)}%` }}
                    />
                  </div>
                  {b.overspent && (
                    <p className="text-coral text-xs mt-2">
                      Over budget by {formatCurrency(b.spent - b.limit_amount, currency)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="glass-panel p-5">
              <h3 className="font-display font-semibold text-mist-100 mb-4 flex items-center gap-2">
                <FiZap className="text-gold" size={17} /> Budget Recommendations
              </h3>
              <p className="text-xs text-mist-400 mb-4">
                Based on your average spend per category over recent transactions.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recommendations.map((r) => (
                  <div key={r.category_id} className="bg-white/5 rounded-xl p-3 flex justify-between items-center">
                    <span className="text-sm text-mist-100">{categoryName(r.category_id) || "Category"}</span>
                    <span className="text-sm font-semibold text-gold">
                      {formatCurrency(r.suggested_monthly_limit, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Budget">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm text-mist-300 mb-1.5 block">Category</label>
            <select className="glass-input" {...register("category_id")}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">Month</label>
              <select className="glass-input" {...register("month", { required: true })}>
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">Year</label>
              <input type="number" className="glass-input" {...register("year", { required: true })} />
            </div>
          </div>
          <div>
            <label className="text-sm text-mist-300 mb-1.5 block">Monthly limit</label>
            <input
              type="number"
              step="0.01"
              className="glass-input"
              {...register("limit_amount", { required: "Limit is required", min: { value: 0.01, message: "Must be positive" } })}
            />
            {errors.limit_amount && <p className="text-coral text-xs mt-1">{errors.limit_amount.message}</p>}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Saving…" : "Create budget"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
