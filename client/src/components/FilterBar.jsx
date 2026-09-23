import { useState, useEffect } from "react";
import api from "../api/axios";

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];
const EXAM_TYPES = ["Mid Sem", "End Sem", "Summer Sem"];

const FALLBACK_BRANCHES = [
  "CSAI", "CSE", "CSDS", "IT", "ITNS", "MAC", "EIOT", "ECE", "EE", "ICE", "ME", "BT", "CSDA", "CIOT", "ECAM", "MEEV", "CE", "GI"
];

export default function FilterBar({ filters, onChange }) {
  const [branches, setBranches] = useState(
    FALLBACK_BRANCHES.map((b) => ({ code: b, fullName: b }))
  );

  useEffect(() => {
    api
      .get("/branches")
      .then((r) => {
        if (Array.isArray(r.data) && r.data.length > 0) {
          setBranches(r.data);
        }
      })
      .catch(() => {
        // use fallback if API call fails
      });
  }, []);

  const sel = (field) => (e) =>
    onChange({ ...filters, [field]: e.target.value, page: 1 });

  const cls =
    "w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400";

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <select
        className={cls}
        value={filters.branch || ""}
        onChange={sel("branch")}
      >
        <option value="">All branches</option>
        {branches.map((b) => (
          <option key={b.code} value={b.code}>
            {b.code} — {b.fullName}
          </option>
        ))}
      </select>
      <select
        className={cls}
        value={filters.semester || ""}
        onChange={sel("semester")}
      >
        <option value="">All semesters</option>
        {SEMESTERS.map((s) => (
          <option key={s} value={s}>
            Sem {s}
          </option>
        ))}
      </select>
      <input
        className={cls}
        placeholder="Subject…"
        value={filters.subject || ""}
        onChange={sel("subject")}
      />
      <select className={cls} value={filters.year || ""} onChange={sel("year")}>
        <option value="">All years</option>
        {YEARS.map((y) => (
          <option key={y}>{y}</option>
        ))}
      </select>
      <select
        className={cls}
        value={filters.examType || ""}
        onChange={sel("examType")}
      >
        <option value="">All exam types</option>
        {EXAM_TYPES.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
    </div>
  );
}
