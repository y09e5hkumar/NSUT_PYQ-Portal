import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg tracking-tight">
          📄 NSUT PYQ Portal
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              {user.role === "admin" && (
                <>
                  <Link
                    to="/admin"
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hidden md:block"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/admin/review"
                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hidden md:block"
                  >
                    Review
                  </Link>
                </>
              )}
              <Link
                to="/upload"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Upload
              </Link>
              <span className="text-gray-400 hidden md:block">|</span>
              <span className="text-gray-600 dark:text-gray-400 hidden md:block">
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="text-red-500 hover:text-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-1.5 rounded-lg text-sm"
              >
                Register
              </Link>
            </>
          )}
          {/* Dark mode toggle */}
          <button
            onClick={() => setDark((d) => !d)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Toggle dark mode"
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
      </div>
    </nav>
  );
}
