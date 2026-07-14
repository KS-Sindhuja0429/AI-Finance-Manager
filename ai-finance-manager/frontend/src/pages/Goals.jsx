import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FiPlus, FiTrash2, FiTarget, FiDollarSign } from "react-icons/fi";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import Loader from "../components/Loader";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { formatCurrency, formatDate } from "../utils/format";

export default function Goals() {
  const { user } = useAuth();
  const currency = user?.currency || "USD";
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [contributeTarget, setContributeTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const createForm = useForm();
  const contributeForm = useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/goals");
      setGoals(res.data.goals);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    createForm.reset({ name: "", target_amount: "", current_amount: 0, deadline: "" });
    setModalOpen(true);
  };

  const onCreate = async (data) => {
    setSubmitting(true);
    try {
      await api.post("/goals", {
        ...data,
        target_amount: parseFloat(data.target_amount),
        current_amount: parseFloat(data.current_amount || 0),
        deadline: data.deadline || null,
      });
      toast.success("Goal created");
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const onContribute = async (data) => {
    setSubmitting(true);
    try {
      await api.post(`/goals/${contributeTarget.id}/contribute`, {
        amount: parseFloat(data.amount),
      });
      toast.success("Contribution added");
      setContributeTarget(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this goal?")) return;
    try {
      await api.delete(`/goals/${id}`);
      toast.success("Goal deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <Layout title="Goals">
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={openCreate}>
          <FiPlus size={16} /> Add Goal
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : goals.length === 0 ? (
        <p className="text-mist-400 text-sm py-12 text-center glass-panel">
          No savings goals yet — set one to start tracking progress.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((g) => (
            <div key={g.id} className="glass-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/20 text-gold flex items-center justify-center">
                  <FiTarget size={16} />
                </span>
                <button onClick={() => handleDelete(g.id)} className="text-mist-400 hover:text-coral">
                  <FiTrash2 size={14} />
                </button>
              </div>
              <p className="font-display font-semibold text-mist-100 mb-1">{g.name}</p>
              {g.deadline && <p className="text-xs text-mist-400 mb-3">Target date: {formatDate(g.deadline)}</p>}
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-mist-300">{formatCurrency(g.current_amount, currency)}</span>
                <span className="text-mist-400">of {formatCurrency(g.target_amount, currency)}</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/5 overflow-hidden mb-4">
                <div className="h-full bg-gold rounded-full" style={{ width: `${g.progress_percent}%` }} />
              </div>
              <button
                className="btn-secondary w-full"
                onClick={() => {
                  contributeForm.reset({ amount: "" });
                  setContributeTarget(g);
                }}
              >
                <FiDollarSign size={14} /> Add Contribution
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Goal">
        <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
          <div>
            <label className="text-sm text-mist-300 mb-1.5 block">Goal name</label>
            <input className="glass-input" {...createForm.register("name", { required: "Name is required" })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">Target amount</label>
              <input type="number" step="0.01" className="glass-input" {...createForm.register("target_amount", { required: true })} />
            </div>
            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">Starting amount</label>
              <input type="number" step="0.01" className="glass-input" {...createForm.register("current_amount")} />
            </div>
          </div>
          <div>
            <label className="text-sm text-mist-300 mb-1.5 block">Deadline (optional)</label>
            <input type="date" className="glass-input" {...createForm.register("deadline")} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Saving…" : "Create goal"}
          </button>
        </form>
      </Modal>

      <Modal open={!!contributeTarget} onClose={() => setContributeTarget(null)} title={`Contribute to ${contributeTarget?.name || ""}`}>
        <form onSubmit={contributeForm.handleSubmit(onContribute)} className="space-y-4">
          <div>
            <label className="text-sm text-mist-300 mb-1.5 block">Amount</label>
            <input type="number" step="0.01" className="glass-input" {...contributeForm.register("amount", { required: true })} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Saving…" : "Add contribution"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
