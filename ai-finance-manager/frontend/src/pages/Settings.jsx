import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { FiUser, FiLock, FiSun, FiMoon, FiBell, FiDollarSign } from "react-icons/fi";
import Layout from "../components/Layout";
import Loader from "../components/Loader";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const profileForm = useForm({ defaultValues: { name: user?.name || "" } });
  const passwordForm = useForm();

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/settings");
      setSettings(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSaveProfile = async (data) => {
    setSavingProfile(true);
    try {
      const res = await api.put("/auth/profile", { name: data.name });
      updateUser(res.data.user);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSavingProfile(false);
    }
  };

  const onSavePassword = async (data) => {
    if (data.new_password !== data.confirm_password) {
      toast.error("New passwords don't match");
      return;
    }
    setSavingPassword(true);
    try {
      await api.put("/auth/change-password", {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      toast.success("Password changed");
      passwordForm.reset();
    } catch (err) {
      toast.error(err.response?.data?.message || "Password change failed");
    } finally {
      setSavingPassword(false);
    }
  };

  const updatePref = async (patch) => {
    setSavingPrefs(true);
    try {
      const res = await api.put("/settings", patch);
      setSettings((prev) => ({ ...prev, ...res.data }));
      if (patch.currency) {
        updateUser({ ...user, currency: res.data.currency });
      }
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setSavingPrefs(false);
    }
  };

  if (loading || !settings) {
    return (
      <Layout title="Settings">
        <Loader />
      </Layout>
    );
  }

  return (
    <Layout title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiUser className="text-pulse" size={18} />
            <h3 className="font-display font-semibold text-mist-100">Profile</h3>
          </div>
          <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">Full name</label>
              <input className="glass-input" {...profileForm.register("name", { required: true })} />
            </div>
            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">Email</label>
              <input className="glass-input opacity-60" value={user?.email || ""} disabled />
            </div>
            <button type="submit" className="btn-primary" disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save profile"}
            </button>
          </form>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiLock className="text-pulse" size={18} />
            <h3 className="font-display font-semibold text-mist-100">Change Password</h3>
          </div>
          <form onSubmit={passwordForm.handleSubmit(onSavePassword)} className="space-y-4">
            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">Current password</label>
              <input
                type="password"
                className="glass-input"
                {...passwordForm.register("current_password", { required: true })}
              />
            </div>
            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">New password</label>
              <input
                type="password"
                className="glass-input"
                {...passwordForm.register("new_password", { required: true, minLength: 6 })}
              />
            </div>
            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">Confirm new password</label>
              <input
                type="password"
                className="glass-input"
                {...passwordForm.register("confirm_password", { required: true })}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={savingPassword}>
              {savingPassword ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiSun className="text-pulse" size={18} />
            <h3 className="font-display font-semibold text-mist-100">Appearance</h3>
          </div>
          <p className="text-sm text-mist-400 mb-4">Choose how Pulse looks for you.</p>
          <div className="flex gap-3">
            <button
              className={settings.theme === "dark" ? "btn-primary flex-1" : "btn-secondary flex-1"}
              onClick={() => updatePref({ theme: "dark" })}
              disabled={savingPrefs}
            >
              <FiMoon size={15} /> Dark
            </button>
            <button
              className={settings.theme === "light" ? "btn-primary flex-1" : "btn-secondary flex-1"}
              onClick={() => updatePref({ theme: "light" })}
              disabled={savingPrefs}
            >
              <FiSun size={15} /> Light
            </button>
          </div>
          <p className="text-xs text-mist-400 mt-3">
            Pulse ships as a premium dark-first experience; light mode is saved to your profile for
            when you extend the app's theming.
          </p>
        </div>

        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiDollarSign className="text-pulse" size={18} />
            <h3 className="font-display font-semibold text-mist-100">Currency</h3>
          </div>
          <select
            className="glass-input"
            value={settings.currency}
            onChange={(e) => updatePref({ currency: e.target.value })}
            disabled={savingPrefs}
          >
            {settings.available_currencies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              <FiBell className="text-pulse" size={18} />
              <div>
                <p className="text-sm font-medium text-mist-100">Notifications</p>
                <p className="text-xs text-mist-400">Budget alerts and goal reminders</p>
              </div>
            </div>
            <button
              onClick={() => updatePref({ notifications_enabled: !settings.notifications_enabled })}
              className={`w-12 h-7 rounded-full flex items-center transition-colors px-0.5 ${
                settings.notifications_enabled ? "bg-pulse justify-end" : "bg-white/10 justify-start"
              }`}
              disabled={savingPrefs}
            >
              <span className="w-6 h-6 rounded-full bg-white block" />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
