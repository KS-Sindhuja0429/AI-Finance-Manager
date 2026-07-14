import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { FiMail, FiLock } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await login(data.email, data.password);
      toast.success("Welcome back");
      navigate(location.state?.from?.pathname || "/", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <svg width="32" height="24" viewBox="0 0 64 24" className="text-pulse">
            <polyline
              points="0,12 14,12 19,2 25,22 30,12 64,12"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-display font-bold text-2xl text-mist-100">Pulse</span>
        </div>

        <div className="glass-panel p-8">
          <h2 className="font-display font-semibold text-xl text-mist-100 mb-1">
            Welcome back
          </h2>
          <p className="text-sm text-mist-400 mb-6">Sign in to manage your finances</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">Email</label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-3 text-mist-400" size={18} />
                <input
                  type="email"
                  className="glass-input pl-11"
                  placeholder="you@example.com"
                  {...register("email", { required: "Email is required" })}
                />
              </div>
              {errors.email && (
                <p className="text-coral text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-3 text-mist-400" size={18} />
                <input
                  type="password"
                  className="glass-input pl-11"
                  placeholder="••••••••"
                  {...register("password", { required: "Password is required" })}
                />
              </div>
              {errors.password && (
                <p className="text-coral text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button type="submit" className="btn-primary w-full mt-2" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-sm text-mist-400 text-center mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-pulse font-medium hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
