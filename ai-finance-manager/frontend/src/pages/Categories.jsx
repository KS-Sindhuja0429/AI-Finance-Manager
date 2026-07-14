import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import Loader from "../components/Loader";
import api from "../api/axios";

const COLORS = ["#2DD4BF", "#F5B14C", "#FB7185", "#818CF8", "#38BDF8", "#FACC15", "#A78BFA", "#34D399", "#F472B6", "#94A3B8"];

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/categories");
      setCategories(res.data.categories);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", type: "expense", color: COLORS[0] });
    setModalOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    reset({ name: cat.name, type: cat.type, color: cat.color });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, data);
        toast.success("Category updated");
      } else {
        await api.post("/categories", data);
        toast.success("Category created");
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
    if (!window.confirm("Delete this category? Transactions using it will become uncategorized.")) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success("Category deleted");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <Layout title="Categories">
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={openCreate}>
          <FiPlus size={16} /> Add Category
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c) => (
            <div key={c.id} className="glass-panel p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                <div>
                  <p className="text-sm font-medium text-mist-100">{c.name}</p>
                  <p className="text-xs text-mist-400 capitalize">{c.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => openEdit(c)} className="text-mist-400 hover:text-pulse">
                  <FiEdit2 size={14} />
                </button>
                <button onClick={() => handleDelete(c.id)} className="text-mist-400 hover:text-coral">
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Category" : "Add Category"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm text-mist-300 mb-1.5 block">Name</label>
            <input className="glass-input" {...register("name", { required: "Name is required" })} />
            {errors.name && <p className="text-coral text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="text-sm text-mist-300 mb-1.5 block">Type</label>
            <select className="glass-input" {...register("type", { required: true })}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-mist-300 mb-1.5 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <label key={color} className="cursor-pointer">
                  <input type="radio" value={color} className="sr-only peer" {...register("color")} />
                  <span
                    className="block w-7 h-7 rounded-full border-2 border-transparent peer-checked:border-mist-100"
                    style={{ backgroundColor: color }}
                  />
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Saving…" : editing ? "Save changes" : "Create category"}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
