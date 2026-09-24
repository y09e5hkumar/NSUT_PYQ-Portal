import { useEffect, useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";

const FALLBACK_BRANCHES = [
  "CSAI", "CSE", "CSDS", "IT", "ITNS", "MAC", "EIOT", "ECE", "EE", "ICE", "ME", "BT", "CSDA", "CIOT", "ECAM", "MEEV", "CE", "GI"
];

export default function ReportsQueue() {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState(
    FALLBACK_BRANCHES.map((b) => ({ code: b, fullName: b }))
  );

  // Correct Metadata Modal
  const [editingReport, setEditingReport] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    subject: "",
    branch: "",
    semester: 1,
    year: 2024,
    examType: "End Sem",
    courseCode: "",
    degree: "B.Tech",
  });

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/reports?status=${statusFilter}`);
      setReports(data);
    } catch (err) {
      toast.error("Failed to load reports queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    api
      .get("/branches")
      .then((r) => {
        if (Array.isArray(r.data) && r.data.length > 0) {
          setBranches(r.data);
        }
      })
      .catch(() => {});
  }, [statusFilter]);

  const handleResolve = async (reportId, resolution, updatedMetadata = null) => {
    try {
      await api.patch(`/admin/reports/${reportId}/resolve`, {
        resolution,
        updatedMetadata,
      });
      toast.success(`Report resolved: ${resolution.replace(/_/g, " ")}`);
      setEditingReport(null);
      fetchReports();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resolve report.");
    }
  };

  const openEditModal = (report) => {
    const p = report.paper || {};
    setEditForm({
      title: p.title || "",
      subject: p.subject || "",
      branch: p.branch || "",
      semester: p.semester || 1,
      year: p.year || 2024,
      examType: p.examType || "End Sem",
      courseCode: p.courseCode || "",
      degree: p.degree || "B.Tech",
    });
    setEditingReport(report);
  };

  const submitMetadataCorrection = (e) => {
    e.preventDefault();
    if (!editingReport) return;
    handleResolve(editingReport._id, "metadata_corrected", editForm);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Community Reports Queue</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1.5 text-xs rounded-xl font-medium border ${
              statusFilter === "pending"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-300 dark:border-amber-800"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500"
            }`}
          >
            Pending Reports
          </button>
          <button
            onClick={() => setStatusFilter("resolved")}
            className={`px-3 py-1.5 text-xs rounded-xl font-medium border ${
              statusFilter === "resolved"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800"
                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500"
            }`}
          >
            Resolved History
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading reports…</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No {statusFilter} reports found 🎉
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => {
            const paper = r.paper;
            return (
              <div
                key={r._id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                  <div>
                    <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 mr-2">
                      Reason: {r.reason.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-gray-400">
                      Reported by: {r.reportedBy?.name || "Student"} ({r.reportedBy?.email || "N/A"})
                    </span>
                  </div>
                  {paper && (
                    <a
                      href={paper.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                    >
                      View PDF Paper ↗
                    </a>
                  )}
                </div>

                {paper ? (
                  <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-xl text-xs space-y-1">
                    <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {paper.courseTitle ? `${paper.courseTitle} — ${paper.examType} ${paper.year}` : paper.title}
                    </div>
                    <div className="text-gray-500">
                      Branch: <strong>{paper.branch || paper.pendingBranchName}</strong> · Sem {paper.semester} · Course Title: {paper.courseTitle || paper.subject} · Code: {paper.courseCode || "N/A"}
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 text-xs text-red-500 italic">
                    [Paper document has been deleted or removed]
                  </div>
                )}

                {r.comment && (
                  <div className="mb-4 text-xs text-gray-600 dark:text-gray-300 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                    <strong>Student Comment:</strong> "{r.comment}"
                  </div>
                )}

                {r.status === "pending" && paper && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => handleResolve(r._id, "dismissed")}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium"
                    >
                      Dismiss Report
                    </button>
                    <button
                      onClick={() => openEditModal(r)}
                      className="text-xs px-3 py-1.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-lg font-medium hover:opacity-80"
                    >
                      Correct Metadata
                    </button>
                    <button
                      onClick={() => handleResolve(r._id, "paper_removed")}
                      className="text-xs px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg font-medium hover:opacity-80"
                    >
                      Remove Paper
                    </button>
                  </div>
                )}

                {r.status === "resolved" && (
                  <div className="text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
                    Resolution: <strong className="text-gray-700 dark:text-gray-300">{r.resolution}</strong>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Correct Metadata Modal */}
      {editingReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Correct Metadata</h3>
              <button
                onClick={() => setEditingReport(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitMetadataCorrection} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Course Title</label>
                <input
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-900"
                  value={editForm.courseTitle || editForm.subject || editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, courseTitle: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Branch</label>
                  <select
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-900"
                    value={editForm.branch}
                    onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.code} — {b.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Semester</label>
                  <select
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-900"
                    value={editForm.semester}
                    onChange={(e) => setEditForm({ ...editForm, semester: Number(e.target.value) })}
                    required
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Sem {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                <input
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-900"
                  value={editForm.subject}
                  onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Course Code</label>
                  <input
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-900"
                    value={editForm.courseCode}
                    onChange={(e) => setEditForm({ ...editForm, courseCode: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
                  <input
                    type="number"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-900"
                    value={editForm.year}
                    onChange={(e) => setEditForm({ ...editForm, year: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700"
                >
                  Save & Resolve Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
