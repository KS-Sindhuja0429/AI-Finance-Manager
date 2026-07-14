import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiUser, FiMail, FiLock } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch("password");

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await registerUser(data.name, data.email, data.password);
      toast.success("Account created — welcome to Pulse");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
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
            Create your account
          </h2>
          <p className="text-sm text-mist-400 mb-6">Start tracking your money in minutes</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">Full name</label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-3 text-mist-400" size={18} />
                <input
                  type="text"
                  className="glass-input pl-11"
                  placeholder="Jane Doe"
                  {...register("name", { required: "Name is required" })}
                />
              </div>
              {errors.name && <p className="text-coral text-xs mt-1">{errors.name.message}</p>}
            </div>

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
              {errors.email && <p className="text-coral text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">Password</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-3 text-mist-400" size={18} />
                <input
                  type="password"
                  className="glass-input pl-11"
                  placeholder="At least 6 characters"
                  {...register("password", {
                    required: "Password is required",
                    minLength: { value: 6, message: "At least 6 characters" },
                  })}
                />
              </div>
              {errors.password && (
                <p className="text-coral text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="text-sm text-mist-300 mb-1.5 block">Confirm password</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-3 text-mist-400" size={18} />
                <input
                  type="password"
                  className="glass-input pl-11"
                  placeholder="Re-enter password"
                  {...register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: (value) => value === password || "Passwords do not match",
                  })}
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-coral text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button type="submit" className="btn-primary w-full mt-2" disabled={submitting}>
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-sm text-mist-400 text-center mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-pulse font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
