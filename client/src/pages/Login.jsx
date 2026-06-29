import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [notVerified, setNotVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useState(() => {
    if (searchParams.get("verified") === "true") {
      toast.success("Email verified! You can now login.");
    }
    if (searchParams.get("error") === "google") {
      toast.error("Google login failed. Try again.");
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotVerified(false);
    try {
      const { data } = await api.post("/auth/login", form);
      login(data.token, data.user);
      toast.success("Logged in!");
      navigate(data.user.role === "admin" ? "/admin" : "/");
    } catch (err) {
      if (err.response?.data?.notVerified) {
        setNotVerified(true);
      } else {
        toast.error(err.response?.data?.message || "Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post("/auth/resend-verification", { email: form.email });
      toast.success("Verification email sent!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend");
    } finally {
      setResending(false);
    }
  };

  const inp =
    "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400";

  return (
    <div className="max-w-md mx-auto mt-16">
      <h1 className="text-2xl font-semibold mb-8 text-center">Welcome back</h1>

      {notVerified && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
            Your email is not verified yet. Check your inbox.
          </p>
          <button
            onClick={handleResend}
            disabled={resending || !form.email}
            className="text-xs underline text-amber-600 dark:text-amber-400 disabled:opacity-40"
          >
            {resending ? "Sending…" : "Resend verification email"}
          </button>
        </div>
      )}

      {/* Google login */}
      <button
        type="button"
        onClick={() =>
          (window.location.href = "http://localhost:5001/api/auth/google")
        }
        className="w-full flex items-center justify-center gap-3 border border-gray-200 dark:border-gray-700 rounded-xl py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors mb-4"
      >
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path
            fill="#FFC107"
            d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"
          />
          <path
            fill="#FF3D00"
            d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4c-7.6 0-14.2 4.2-17.7 10.7z"
          />
          <path
            fill="#4CAF50"
            d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.6-2.9-11.8-7.1l-6.6 5.1C9.8 39.9 16.5 44 24 44z"
          />
          <path
            fill="#1976D2"
            d="M43.6 20H24v8h11.3c-.9 2.5-2.6 4.6-4.8 6l6.2 5.2C40.5 35.7 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"
          />
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <span className="text-xs text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className={inp}
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          className={inp}
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        No account?{" "}
        <Link
          to="/register"
          className="text-gray-900 dark:text-white underline"
        >
          Register
        </Link>
      </p>
    </div>
  );
}
