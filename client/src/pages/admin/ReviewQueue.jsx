import { useEffect, useState } from "react";
import api from "../../api/axios";
import toast from "react-hot-toast";

export default function ReviewQueue() {
  const [papers, setPapers] = useState([]);

  const fetch = () => api.get("/papers/pending").then((r) => setPapers(r.data));
  useEffect(() => {
    fetch();
  }, []);

  const approve = async (id) => {
    await api.patch(`/papers/${id}/approve`);
    toast.success("Approved!");
    fetch();
  };

  const reject = async (id) => {
    await api.delete(`/papers/${id}`);
    toast.success("Deleted");
    fetch();
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-8">Review queue</h1>
      {papers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No pending papers 🎉
        </div>
      ) : (
        <div className="space-y-3">
          {papers.map((p) => (
            <div
              key={p._id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4"
            >
              <div>
                <div className="font-medium text-sm mb-1">{p.title}</div>
                <div className="text-xs text-gray-400">
                  {p.branch} · Sem {p.semester} · {p.subject} · {p.year} ·{" "}
                  {p.examType}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Uploaded by: {p.uploadedBy?.name} ({p.uploadedBy?.email})
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <a
                  href={p.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Preview
                </a>
                <button
                  onClick={() => approve(p._id)}
                  className="text-xs px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-lg hover:opacity-80"
                >
                  Approve
                </button>
                <button
                  onClick={() => reject(p._id)}
                  className="text-xs px-3 py-1.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg hover:opacity-80"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
