import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import Loader from "../components/Loader";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { formatCurrency, formatDate } from "../utils/format";

export default function Transactions() {
  const { user } = useAuth();
  const currency = user?.currency || "USD";

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const loadMeta = useCallback(async () => {
    const [catRes, accRes] = await Promise.all([api.get("/categories"), api.get("/accounts")]);
    setCategories(catRes.data.categories);
    setAccounts(accRes.data.accounts);
  }, []);

  const loadTransactions = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = { page, per_page: 10, sort_by: sortBy, sort_dir: sortDir };
        if (search) params.search = search;
        if (typeFilter) params.type = typeFilter;
        if (categoryFilter) params.category_id = categoryFilter;
        const res = await api.get("/transactions", { params });
        setTransactions(res.data.transactions);
        setPagination({ page: res.data.page, pages: res.data.pages, total: res.data.total });
      } finally {
        setLoading(false);
      }
    },
    [search, typeFilter, categoryFilter, sortBy, sortDir]
  );

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    loadTransactions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, categoryFilter, sortBy, sortDir]);

  const openCreate = () => {
    setEditing(null);
    reset({ type: "expense", amount: "", date: new Date().toISOString().slice(0, 10), category_id: "", account_id: "", notes: "" });
    setModalOpen(true);
  };

  const openEdit = (tx) => {
    setEditing(tx);
    reset({
      type: tx.type,
      amount: tx.amount,
      date: tx.date,
      category_id: tx.category_id || "",
      account_id: tx.account_id || "",
      notes: tx.notes || "",
    });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    const payload = {
      ...data,
      amount: parseFloat(data.amount),
      category_id: data.category_id || null,
      account_id: data.account_id || null,
    };
    try {
      if (editing) {
        await api.put(`/transactions/${editing.id}`, payload);
        toast.success("Transaction updated");
      } else {
        await api.post("/transactions", payload);
        toast.success("Transaction added");
      }
      setModalOpen(false);
      loadTransactions(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await api.delete(`/transactions/${id}`);
      toast.success("Transaction deleted");
      loadTransactions(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <Layout title="Transactions">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <FiSearch className="absolute left-3.5 top-3 text-mist-400" size={16} />
              <input
                className="glass-input pl-10"
                placeholder="Search notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="glass-input w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select
              className="glass-input w-auto"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="glass-input w-auto"
              value={`${sortBy}:${sortDir}`}
              onChange={(e) => {
                const [sb, sd] = e.target.value.split(":");
                setSortBy(sb);
                setSortDir(sd);
              }}
            >
              <option value="date:desc">Newest first</option>
              <option value="date:asc">Oldest first</option>
              <option value="amount:desc">Amount: high to low</option>
              <option value="amount:asc">Amount: low to high</option>
            </select>
          </div>
          <button className="btn-primary shrink-0" onClick={openCreate}>
            <FiPlus size={16} /> Add Transaction
          </button>
        </div>

        <div className="glass-panel overflow-hidden">
          {loading ? (
            <Loader />
          ) : transactions.length === 0 ? (
            <p className="text-mist-400 text-sm py-12 text-center">No transactions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-mist-400 border-b border-white/5">
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">Account</th>
                    <th className="px-5 py-3 font-medium">Notes</th>
                    <th className="px-5 py-3 font-medium text-right">Amount</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-5 py-3 text-mist-300">{formatDate(t.date)}</td>
                      <td className="px-5 py-3 text-mist-100">{t.category_name || "—"}</td>
                      <td className="px-5 py-3 text-mist-300">{t.account_name || "—"}</td>
                      <td className="px-5 py-3 text-mist-400 max-w-[200px] truncate">{t.notes || "—"}</td>
                      <td
                        className={`px-5 py-3 text-right font-semibold ${
                          t.type === "income" ? "text-pulse" : "text-coral"
                        }`}
                      >
                        {t.type === "income" ? "+" : "-"}
                        {formatCurrency(t.amount, currency)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => openEdit(t)} className="text-mist-400 hover:text-pulse">
                            <FiEdit2 size={15} />
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="text-mist-400 hover:text-coral">
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 text-sm text-mist-400">
              <span>
                Page {pagination.page} of {pagination.pages} · {pagination.total} total
              </span>
              <div className="flex gap-2">
                <button
                  className="btn-secondary px-3 py-1.5"
                  disabled={pagination.page <= 1}
                  onClick={() => loadTransactions(pagination.page - 1)}
                >
                  <FiChevronLeft size={15} />
                </button>
                <button
                  className="btn-secondary px-3 py-1.5"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => loadTransactions(pagination.page + 1)}
                >
                  <FiChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Transaction" : "Add Transaction"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">Type</label>
              <select className="glass-input" {...register("type", { required: true })}>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">Amount</label>
              <input
                type="number"
                step="0.01"
                className="glass-input"
                {...register("amount", { required: "Amount is required", min: { value: 0.01, message: "Must be positive" } })}
              />
              {errors.amount && <p className="text-coral text-xs mt-1">{errors.amount.message}</p>}
            </div>
          </div>

          <div>
            <label className="text-sm text-mist-300 mb-1.5 block">Date</label>
            <input type="date" className="glass-input" {...register("date", { required: true })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">Category</label>
              <select className="glass-input" {...register("category_id")}>
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">Account</label>
              <select className="glass-input" {...register("account_id")}>
                <option value="">None</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-mist-300 mb-1.5 block">Notes</label>
            <textarea className="glass-input" rows={2} {...register("notes")} />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Saving…" : editing ? "Save changes" : "Add transaction"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
