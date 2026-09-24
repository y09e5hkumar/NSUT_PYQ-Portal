import { useEffect, useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const TABS = [
  { key: "branches", label: "New Branches", icon: "🌿" },
  { key: "subjects", label: "New Subjects", icon: "📚" },
  { key: "courseCodes", label: "New Course Codes", icon: "🔖" },
];

// ─── Shared helpers ────────────────────────────────────────────────────────────

function PaperList({ papers }) {
  if (!papers?.length) return null;
  return (
    <div className="mt-2 space-y-1">
      {papers.map((p) => (
        <a
          key={p._id}
          href={`/paper/${p._id}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          <span>📄</span>
          <span className="truncate">{p.title}</span>
          <span className="text-gray-400 shrink-0">by {p.uploadedBy?.name || "unknown"}</span>
        </a>
      ))}
    </div>
  );
}

function Badge({ children, variant = "amber" }) {
  const cls = {
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  }[variant];
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {children}
    </span>
  );
}

// ─── Branch Pending Tab ────────────────────────────────────────────────────────

function BranchTab({ items, onRefresh, branches }) {
  const [resolving, setResolving] = useState({});
  const [selections, setSelections] = useState({}); // { [pendingName]: { action, targetCode, newCode, newFullName } }

  const getOrInit = (name) =>
    selections[name] || { action: "create_new", targetCode: "", newCode: "", newFullName: "" };

  const update = (name, patch) =>
    setSelections((prev) => ({ ...prev, [name]: { ...getOrInit(name), ...patch } }));

  const handleResolve = async (pendingName) => {
    const sel = getOrInit(pendingName);
    setResolving((r) => ({ ...r, [pendingName]: true }));
    try {
      if (sel.action === "create_new") {
        if (!sel.newCode.trim() || !sel.newFullName.trim()) {
          return toast.error("Provide branch code and full name.");
        }
        await api.post("/admin/branches/resolve-pending", {
          pendingName,
          action: "create_new",
          newBranchData: { code: sel.newCode.trim(), fullName: sel.newFullName.trim() },
        });
      } else {
        if (!sel.targetCode.trim()) return toast.error("Select an existing branch.");
        await api.post("/admin/branches/resolve-pending", {
          pendingName,
          action: "map_existing",
          targetCode: sel.targetCode.trim(),
        });
      }
      toast.success(`Resolved "${pendingName}" ✅`);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Resolution failed.");
    } finally {
      setResolving((r) => ({ ...r, [pendingName]: false }));
    }
  };

  if (!items.length) {
    return <EmptyState label="No pending branch requests" />;
  }

  return (
    <div className="space-y-4">
      {items.map(({ pendingName, count, papers }) => {
        const sel = getOrInit(pendingName);
        return (
          <div
            key={pendingName}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="font-semibold text-sm">{pendingName}</span>
              <Badge variant="amber">{count} paper{count !== 1 ? "s" : ""}</Badge>
            </div>

            <PaperList papers={papers} />

            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => update(pendingName, { action: "create_new" })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sel.action === "create_new"
                      ? "bg-indigo-600 text-white"
                      : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  Approve as new
                </button>
                <button
                  onClick={() => update(pendingName, { action: "map_existing" })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sel.action === "map_existing"
                      ? "bg-indigo-600 text-white"
                      : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  Map to existing
                </button>
              </div>

              {sel.action === "create_new" && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-gray-950"
                    placeholder="Branch code (e.g. CSAI)"
                    value={sel.newCode}
                    onChange={(e) => update(pendingName, { newCode: e.target.value.toUpperCase() })}
                  />
                  <input
                    className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-gray-950"
                    placeholder="Full name"
                    value={sel.newFullName}
                    onChange={(e) => update(pendingName, { newFullName: e.target.value })}
                  />
                </div>
              )}

              {sel.action === "map_existing" && (
                <select
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-gray-950"
                  value={sel.targetCode}
                  onChange={(e) => update(pendingName, { targetCode: e.target.value })}
                >
                  <option value="">Select canonical branch…</option>
                  {branches.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.code} — {b.fullName}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() => handleResolve(pendingName)}
                disabled={resolving[pendingName]}
                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
              >
                {resolving[pendingName] ? "Resolving…" : "Confirm resolution"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Subject Pending Tab ───────────────────────────────────────────────────────

function SubjectTab({ items, onRefresh, branches }) {
  const [resolving, setResolving] = useState({});
  const [selections, setSelections] = useState({});
  const [existingSubjects, setExistingSubjects] = useState({});

  const keyOf = (item) => `${item.branch}||${item.pendingName}`;

  const getOrInit = (key) =>
    selections[key] || { action: "create_new", canonicalName: "", mapTarget: "" };

  const update = (key, patch) =>
    setSelections((prev) => ({ ...prev, [key]: { ...getOrInit(key), ...patch } }));

  const loadExistingSubjects = async (branch) => {
    if (existingSubjects[branch]) return;
    try {
      const { data } = await api.get(`/subjects?branch=${branch}`);
      setExistingSubjects((prev) => ({ ...prev, [branch]: data }));
    } catch {}
  };

  const handleResolve = async (item) => {
    const key = keyOf(item);
    const sel = getOrInit(key);
    const canonical = sel.action === "map_existing" ? sel.mapTarget : (sel.canonicalName.trim() || item.pendingName);

    if (!canonical) return toast.error("Provide or select a canonical subject name.");

    setResolving((r) => ({ ...r, [key]: true }));
    try {
      await api.post("/admin/subjects/resolve-pending", {
        pendingName: item.pendingName,
        branch: item.branch,
        action: sel.action,
        canonicalName: canonical,
      });
      toast.success(`Resolved "${item.pendingName}" → "${canonical}" ✅`);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Resolution failed.");
    } finally {
      setResolving((r) => ({ ...r, [key]: false }));
    }
  };

  if (!items.length) {
    return <EmptyState label="No pending subject requests" />;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const key = keyOf(item);
        const sel = getOrInit(key);
        const existing = existingSubjects[item.branch] || [];

        return (
          <div
            key={key}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-1">
              <span className="font-semibold text-sm">"{item.pendingName}"</span>
              <Badge variant="amber">{item.count} paper{item.count !== 1 ? "s" : ""}</Badge>
              <Badge variant="indigo">{item.branch}</Badge>
            </div>

            <PaperList papers={item.papers} />

            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => { update(key, { action: "create_new" }); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sel.action === "create_new" ? "bg-indigo-600 text-white" : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  Approve as new
                </button>
                <button
                  onClick={() => { update(key, { action: "map_existing" }); loadExistingSubjects(item.branch); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sel.action === "map_existing" ? "bg-indigo-600 text-white" : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  Map to existing
                </button>
              </div>

              {sel.action === "create_new" && (
                <div>
                  <input
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-gray-950"
                    placeholder={`Canonical name (leave blank to use "${item.pendingName}")`}
                    value={sel.canonicalName}
                    onChange={(e) => update(key, { canonicalName: e.target.value })}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Existing subjects under {item.branch}:{" "}
                    {existing.length ? existing.map((s) => s.name).join(", ") : "none yet"}
                  </p>
                </div>
              )}

              {sel.action === "map_existing" && (
                <select
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-gray-950"
                  value={sel.mapTarget}
                  onChange={(e) => update(key, { mapTarget: e.target.value })}
                >
                  <option value="">Select existing subject…</option>
                  {existing.map((s) => (
                    <option key={s._id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              )}

              <button
                onClick={() => handleResolve(item)}
                disabled={resolving[key]}
                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
              >
                {resolving[key] ? "Resolving…" : "Confirm resolution"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CourseCode Pending Tab ────────────────────────────────────────────────────

function CourseCodeTab({ items, onRefresh }) {
  const [resolving, setResolving] = useState({});
  const [selections, setSelections] = useState({});

  const keyOf = (item) => `${item.branch}||${item.subject}||${item.pendingCode}`;

  const getOrInit = (key) =>
    selections[key] || { action: "create_new", canonicalCode: "", mapTarget: "" };

  const update = (key, patch) =>
    setSelections((prev) => ({ ...prev, [key]: { ...getOrInit(key), ...patch } }));

  const handleResolve = async (item) => {
    const key = keyOf(item);
    const sel = getOrInit(key);
    const canonical = sel.action === "map_existing" ? sel.mapTarget : (sel.canonicalCode.trim() || item.pendingCode);

    if (!canonical) return toast.error("Provide or select a canonical course code.");

    setResolving((r) => ({ ...r, [key]: true }));
    try {
      await api.post("/admin/course-codes/resolve-pending", {
        pendingCode: item.pendingCode,
        branch: item.branch,
        subjectName: item.subject,
        action: sel.action,
        canonicalCode: canonical.toUpperCase(),
      });
      toast.success(`Resolved "${item.pendingCode}" → "${canonical.toUpperCase()}" ✅`);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Resolution failed.");
    } finally {
      setResolving((r) => ({ ...r, [key]: false }));
    }
  };

  if (!items.length) {
    return <EmptyState label="No pending course code requests" />;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const key = keyOf(item);
        const sel = getOrInit(key);

        return (
          <div
            key={key}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <span className="font-semibold text-sm font-mono">{item.pendingCode}</span>
              <Badge variant="amber">{item.count} paper{item.count !== 1 ? "s" : ""}</Badge>
              <Badge variant="indigo">{item.branch}</Badge>
              <Badge variant="green">{item.subject}</Badge>
            </div>

            <PaperList papers={item.papers} />

            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => update(key, { action: "create_new" })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sel.action === "create_new" ? "bg-indigo-600 text-white" : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  Approve as new
                </button>
                <button
                  onClick={() => update(key, { action: "map_existing" })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    sel.action === "map_existing" ? "bg-indigo-600 text-white" : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  Map to existing
                </button>
              </div>

              {sel.action === "create_new" && (
                <input
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-gray-950"
                  placeholder={`Canonical code (leave blank to use "${item.pendingCode}")`}
                  value={sel.canonicalCode}
                  onChange={(e) => update(key, { canonicalCode: e.target.value.toUpperCase() })}
                />
              )}

              {sel.action === "map_existing" && (
                <input
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-gray-950"
                  placeholder="Enter existing canonical course code"
                  value={sel.mapTarget}
                  onChange={(e) => update(key, { mapTarget: e.target.value.toUpperCase() })}
                />
              )}

              <button
                onClick={() => handleResolve(item)}
                disabled={resolving[key]}
                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
              >
                {resolving[key] ? "Resolving…" : "Confirm resolution"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ label }) {
  return (
    <div className="text-center py-16 text-gray-400 text-sm">
      <div className="text-3xl mb-3">✅</div>
      {label}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PendingReview() {
  const [data, setData] = useState({ branches: [], subjects: [], courseCodes: [] });
  const [branches, setBranches] = useState([]);
  const [activeTab, setActiveTab] = useState("branches");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [queueRes, branchesRes] = await Promise.all([
        api.get("/admin/pending-review"),
        api.get("/branches"),
      ]);
      setData(queueRes.data);
      setBranches(Array.isArray(branchesRes.data) ? branchesRes.data : []);
    } catch {
      toast.error("Failed to load pending review queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const counts = {
    branches: data.branches.length,
    subjects: data.subjects.length,
    courseCodes: data.courseCodes.length,
  };

  const totalPending = counts.branches + counts.subjects + counts.courseCodes;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Pending Review</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalPending} item{totalPending !== 1 ? "s" : ""} awaiting resolution
          </p>
        </div>
        <button
          onClick={fetchData}
          className="text-sm border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === key
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
            {counts[key] > 0 && (
              <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded-full text-[10px] font-semibold">
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === "branches" && (
            <BranchTab items={data.branches} onRefresh={fetchData} branches={branches} />
          )}
          {activeTab === "subjects" && (
            <SubjectTab items={data.subjects} onRefresh={fetchData} branches={branches} />
          )}
          {activeTab === "courseCodes" && (
            <CourseCodeTab items={data.courseCodes} onRefresh={fetchData} />
          )}
        </>
      )}
    </div>
  );
}
