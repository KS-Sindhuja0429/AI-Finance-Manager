import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FiPlus, FiEdit2, FiTrash2, FiCreditCard, FiDollarSign, FiBriefcase, FiTag } from "react-icons/fi";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import Loader from "../components/Loader";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/format";

const TYPE_ICON = {
  cash: FiDollarSign,
  bank: FiBriefcase,
  credit_card: FiCreditCard,
  wallet: FiTag,
};

const TYPE_LABEL = {
  cash: "Cash",
  bank: "Bank",
  credit_card: "Credit Card",
  wallet: "Wallet",
};

export default function Accounts() {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/accounts");
      setAccounts(res.data.accounts);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", type: "cash", balance: 0 });
    setModalOpen(true);
  };

  const openEdit = (acc) => {
    setEditing(acc);
    reset({ name: acc.name, type: acc.type, balance: acc.balance });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    const payload = { ...data, balance: parseFloat(data.balance || 0) };
    try {
      if (editing) {
        await api.put(`/accounts/${editing.id}`, payload);
        toast.success("Account updated");
      } else {
        await api.post("/accounts", payload);
        toast.success("Account created");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this account?")) return;
    try {
      await api.delete(`/accounts/${id}`);
      toast.success("Account deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <Layout title="Accounts">
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={openCreate}>
          <FiPlus size={16} /> Add Account
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : accounts.length === 0 ? (
        <p className="text-mist-400 text-sm py-12 text-center">No accounts yet — add your first one.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => {
            const Icon = TYPE_ICON[a.type] || FiDollarSign;
            return (
              <div key={a.id} className="glass-panel p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="w-10 h-10 rounded-lg bg-pulse/10 border border-pulse/20 text-pulse flex items-center justify-center">
                    <Icon size={17} />
                  </span>
                  <div className="flex items-center gap-3">
                    <button onClick={() => openEdit(a)} className="text-mist-400 hover:text-pulse">
                      <FiEdit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(a.id)} className="text-mist-400 hover:text-coral">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-mist-400">{TYPE_LABEL[a.type]}</p>
                <p className="font-display font-semibold text-lg text-mist-100 mb-1">{a.name}</p>
                <p className="text-xl font-display font-bold text-pulse">
                  {formatCurrency(a.balance, currency)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Account" : "Add Account"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm text-mist-300 mb-1.5 block">Name</label>
            <input className="glass-input" {...register("name", { required: "Name is required" })} />
            {errors.name && <p className="text-coral text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-sm text-mist-300 mb-1.5 block">Type</label>
            <select className="glass-input" {...register("type", { required: true })}>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="credit_card">Credit Card</option>
              <option value="wallet">Wallet</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-mist-300 mb-1.5 block">
              {editing ? "Current balance" : "Starting balance"}
            </label>
            <input type="number" step="0.01" className="glass-input" {...register("balance")} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Saving…" : editing ? "Save changes" : "Create account"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
