import { useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const BRANCHES = [
  "CSAI",
  "CSE",
  "CSDS",
  "IT",
  "ITNS",
  "MAC",
  "EIOT",
  "ECE",
  "EE",
  "ICE",
  "ME",
  "BT",
  "CSDA",
  "CIOT",
  "ECAM",
  "MEEV",
  "CE",
  "GI",
];
const EXAM_TYPES = ["Mid Sem", "End Sem", "Summer Sem"];
const YEARS = [2025, 2024, 2023, 2022, 2021, 2020];

export default function Upload() {
  const [form, setForm] = useState({
    title: "",
    branch: "",
    semester: "",
    subject: "",
    year: "",
    examType: "",
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const inp =
    "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Please select a PDF");
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("pdf", file);
      await api.post("/papers", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Paper uploaded! Pending admin review.");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Upload a paper</h1>
      <p className="text-sm text-gray-500 mb-8">
        Your submission will be reviewed before publishing.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className={inp}
          placeholder="Paper title  e.g. DBMS End Sem 2024"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            className={inp}
            value={form.branch}
            onChange={(e) => setForm({ ...form, branch: e.target.value })}
            required
          >
            <option value="">Branch</option>
            {BRANCHES.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <select
            className={inp}
            value={form.semester}
            onChange={(e) => setForm({ ...form, semester: e.target.value })}
            required
          >
            <option value="">Semester</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Sem {s}
              </option>
            ))}
          </select>
        </div>
        <input
          className={inp}
          placeholder="Subject name"
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            className={inp}
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
            required
          >
            <option value="">Year</option>
            {YEARS.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
          <select
            className={inp}
            value={form.examType}
            onChange={(e) => setForm({ ...form, examType: e.target.value })}
            required
          >
            <option value="">Exam type</option>
            {EXAM_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <label className="block border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 transition-colors">
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files[0])}
          />
          {file ? (
            <span className="text-sm text-gray-700 dark:text-gray-300">
              ✓ {file.name}
            </span>
          ) : (
            <span className="text-sm text-gray-400">
              Click to select PDF (max 20 MB)
            </span>
          )}
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Uploading…" : "Submit paper"}
        </button>
      </form>
    </div>
  );
}
