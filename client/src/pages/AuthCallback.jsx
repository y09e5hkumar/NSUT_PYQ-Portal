import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    const user = searchParams.get("user");
    const error = searchParams.get("error");

    if (error) {
      toast.error("Google login failed. Try again.");
      navigate("/login");
      return;
    }

    if (token && user) {
      try {
        const userData = JSON.parse(decodeURIComponent(user));
        login(token, userData);
        toast.success(`Welcome, ${userData.name}!`);
        navigate(userData.role === "admin" ? "/admin" : "/");
      } catch {
        toast.error("Something went wrong");
        navigate("/login");
      }
    }
  }, []);

  return <div className="text-center mt-20 text-gray-400">Signing you in…</div>;
}
