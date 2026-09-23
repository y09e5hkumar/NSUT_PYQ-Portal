import { useEffect, useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";

export default function BranchRequests() {
  const [pendingGroups, setPendingGroups] = useState([]);
  const [activeBranches, setActiveBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Branch Modal state
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [actionType, setActionType] = useState("map_existing"); // "map_existing" | "create_new"
  const [targetCode, setTargetCode] = useState("");
  const [newBranchData, setNewBranchData] = useState({
    code: "",
    fullName: "",
    aliases: [],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, branchRes] = await Promise.all([
        api.get("/admin/branches/pending"),
        api.get("/branches"),
      ]);
      setPendingGroups(pendingRes.data);
      setActiveBranches(branchRes.data);
    } catch (err) {
      toast.error("Failed to load pending branch requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openResolutionModal = (group) => {
    setSelectedGroup(group);
    setActionType("map_existing");
    setTargetCode(activeBranches[0]?.code || "");
    setNewBranchData({
      code: "",
      fullName: group.pendingName,
      aliases: [group.pendingName],
    });
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGroup) return;

    try {
      const payload = {
        pendingName: selectedGroup.pendingName,
        action: actionType,
        targetCode: actionType === "map_existing" ? targetCode : undefined,
        newBranchData: actionType === "create_new" ? newBranchData : undefined,
      };

      const { data } = await api.post("/admin/branches/resolve-pending", payload);
      toast.success(data.message || "Pending branch request resolved!");
      setSelectedGroup(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resolve pending branch.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">New Branch Requests Queue</h1>
        <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-3 py-1 rounded-full font-medium">
          {pendingGroups.reduce((acc, g) => acc + g.count, 0)} paper(s) pending taxonomy mapping
        </span>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading branch requests…</div>
      ) : pendingGroups.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No pending branch requests 🎉 All papers mapped to active branches!
        </div>
      ) : (
        <div className="space-y-4">
          {pendingGroups.map((group) => (
            <div
              key={group.pendingName}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                    "{group.pendingName}"
                  </h3>
                  <p className="text-xs text-gray-400">
                    Shared by <strong>{group.count} paper(s)</strong> awaiting branch resolution
                  </p>
                </div>
                <button
                  onClick={() => openResolutionModal(group)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700"
                >
                  Resolve Branch Request
                </button>
              </div>

              <div className="space-y-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Affected Uploaded Papers:
                </div>
                {group.papers.map((p) => (
                  <div
                    key={p._id}
                    className="p-3 bg-gray-50 dark:bg-gray-950 rounded-xl text-xs flex items-center justify-between gap-2"
                  >
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100 mr-2">
                        {p.title}
                      </span>
                      <span className="text-gray-400">
                        ({p.year} · Sem {p.semester} · {p.subject})
                      </span>
                    </div>
                    <a
                      href={p.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0"
                    >
                      PDF ↗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolution Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                Resolve Branch: "{selectedGroup.pendingName}"
              </h3>
              <button
                onClick={() => setSelectedGroup(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActionType("map_existing")}
                  className={`py-2 rounded-lg transition-colors ${
                    actionType === "map_existing"
                      ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  Map to Existing Branch Alias
                </button>
                <button
                  type="button"
                  onClick={() => setActionType("create_new")}
                  className={`py-2 rounded-lg transition-colors ${
                    actionType === "create_new"
                      ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  Create New Branch
                </button>
              </div>

              {actionType === "map_existing" ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Select Target Canonical Branch
                  </label>
                  <select
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-900"
                    value={targetCode}
                    onChange={(e) => setTargetCode(e.target.value)}
                    required
                  >
                    {activeBranches.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.code} — {b.fullName}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-2">
                    Note: Adding "{selectedGroup.pendingName}" as an alias to branch <strong>{targetCode}</strong> will automatically map all {selectedGroup.count} paper(s) to {targetCode}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      New Branch Code (e.g. AID)
                    </label>
                    <input
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-900 uppercase"
                      placeholder="e.g. CSDS"
                      value={newBranchData.code}
                      onChange={(e) => setNewBranchData({ ...newBranchData, code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      Full Branch Name
                    </label>
                    <input
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-900"
                      placeholder="e.g. Artificial Intelligence & Data Science"
                      value={newBranchData.fullName}
                      onChange={(e) => setNewBranchData({ ...newBranchData, fullName: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedGroup(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700"
                >
                  Confirm Batch Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
