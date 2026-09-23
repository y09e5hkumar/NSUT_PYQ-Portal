import { useState, useEffect } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";

const EXAM_TYPES = ["Mid Sem", "End Sem", "Summer Sem"];
const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

const FALLBACK_BRANCHES = [
  "CSAI", "CSE", "CSDS", "IT", "ITNS", "MAC", "EIOT", "ECE", "EE", "ICE", "ME", "BT", "CSDA", "CIOT", "ECAM", "MEEV", "CE", "GI"
];

export default function Upload() {
  const [step, setStep] = useState(1); // 1: Select File, 2: Review Extraction & Verification
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);

  const [branches, setBranches] = useState(
    FALLBACK_BRANCHES.map((b) => ({ code: b, fullName: b }))
  );

  const [tempFileRef, setTempFileRef] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [extractionSource, setExtractionSource] = useState("local");
  const [confidence, setConfidence] = useState({});
  const [editedFields, setEditedFields] = useState([]);
  const [similarityCandidates, setSimilarityCandidates] = useState([]);
  const [exactDuplicate, setExactDuplicate] = useState(null);

  const [form, setForm] = useState({
    title: "",
    branch: "",
    pendingBranchName: "",
    semester: "",
    subject: "",
    courseCode: "",
    courseTitle: "",
    year: "",
    examType: "",
    degree: "B.Tech",
  });

  const navigate = useNavigate();

  useEffect(() => {
    api
      .get("/branches")
      .then((r) => {
        if (Array.isArray(r.data) && r.data.length > 0) {
          setBranches(r.data);
        }
      })
      .catch(() => {});
  }, []);

  const inp =
    "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400";

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (!editedFields.includes(field)) {
      setEditedFields((prev) => [...prev, field]);
    }
  };

  const handleExtractLocal = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Please select a PDF file first.");

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("pdf", file);

      const { data } = await api.post("/papers/extract", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setTempFileRef(data.tempFileRef);
      setExtractedText(data.extractedText || "");
      setExtractionSource(data.extractionSource || "local");
      setConfidence(data.confidence || {});
      setSimilarityCandidates(data.similarityCandidates || []);
      setExactDuplicate(data.exactDuplicate || null);

      const m = data.metadata || {};
      const matchedBranch = m.branch || "";
      const rawBranch = m.rawBranchText || "";

      setForm({
        title: m.courseTitle
          ? `${m.courseTitle} ${m.examType || ""} ${m.year || ""}`.trim()
          : file.name.replace(/\.pdf$/i, ""),
        branch: matchedBranch ? matchedBranch : rawBranch ? "OTHER" : "",
        pendingBranchName: matchedBranch ? "" : rawBranch,
        semester: m.semester || "",
        subject: m.subject || m.courseTitle || "",
        courseCode: m.courseCode || "",
        courseTitle: m.courseTitle || m.subject || "",
        year: m.year || "",
        examType: m.examType || "",
        degree: m.degree || "B.Tech",
      });

      setStep(2);
      toast.success("Metadata extracted! Please verify fields.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Extraction failed. Please fill metadata manually.");
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleGeminiFallback = async () => {
    if (!tempFileRef) return toast.error("File reference lost. Please select file again.");

    setGeminiLoading(true);
    try {
      const { data } = await api.post("/papers/extract/gemini", { tempFileRef });

      setExtractionSource("gemini");
      setConfidence(data.confidence || {});
      setSimilarityCandidates(data.similarityCandidates || []);
      setExactDuplicate(data.exactDuplicate || null);

      const m = data.metadata || {};
      const matchedBranch = m.branch || "";
      const rawBranch = m.rawBranchText || "";

      setForm((prev) => ({
        ...prev,
        title: m.courseTitle ? `${m.courseTitle} ${m.examType || ""} ${m.year || ""}`.trim() : prev.title,
        branch: matchedBranch ? matchedBranch : rawBranch ? "OTHER" : prev.branch,
        pendingBranchName: matchedBranch ? "" : rawBranch || prev.pendingBranchName,
        semester: m.semester || prev.semester,
        subject: m.subject || m.courseTitle || prev.subject,
        courseCode: m.courseCode || prev.courseCode,
        courseTitle: m.courseTitle || prev.courseTitle,
        year: m.year || prev.year,
        examType: m.examType || prev.examType,
        degree: m.degree || prev.degree,
      }));

      toast.success("Re-extracted metadata using Gemini AI!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gemini extraction failed.");
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleSubmitFinal = async (e) => {
    e.preventDefault();

    if (exactDuplicate) {
      return toast.error("This paper already exists for this branch. Cannot upload duplicate.");
    }

    if (!form.branch || !form.semester || !form.subject || !form.year || !form.examType) {
      return toast.error("Please fill in all required paper details.");
    }

    if (form.branch === "OTHER" && !form.pendingBranchName.trim()) {
      return toast.error("Please specify your unlisted branch name.");
    }

    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("branchPending", form.branch === "OTHER" ? "true" : "false");
      fd.append("tempFileRef", tempFileRef);
      fd.append("extractedText", extractedText);
      fd.append("extractionSource", extractionSource);
      fd.append("editedFields", JSON.stringify(editedFields));
      fd.append("confidence", JSON.stringify(confidence));

      if (file && !tempFileRef) {
        fd.append("pdf", file);
      }

      await api.post("/papers", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Paper published successfully! 🎉");
      navigate("/");
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error("Duplicate detected! This paper is already uploaded.");
      } else {
        toast.error(err.response?.data?.message || "Upload failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getConfBadge = (field) => {
    const score = confidence[field];
    if (score === undefined) return null;
    if (score < 0.6) {
      return (
        <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-2 py-0.5 rounded-full ml-2">
          ⚠️ Low confidence
        </span>
      );
    }
    return (
      <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-full ml-2">
        ✓ Auto-detected
      </span>
    );
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Upload a paper</h1>
      <p className="text-sm text-gray-500 mb-6">
        AI-assisted paper extraction & instant publishing pipeline.
      </p>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8 text-xs font-medium">
        <div
          className={`flex-1 py-2 text-center rounded-lg border ${
            step === 1
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent"
              : "bg-gray-100 dark:bg-gray-900 text-gray-400 border-gray-200 dark:border-gray-800"
          }`}
        >
          1. Select File & Extract
        </div>
        <div
          className={`flex-1 py-2 text-center rounded-lg border ${
            step === 2
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-transparent"
              : "bg-gray-100 dark:bg-gray-900 text-gray-400 border-gray-200 dark:border-gray-800"
          }`}
        >
          2. Verify & Publish
        </div>
      </div>

      {step === 1 && (
        <form onSubmit={handleExtractLocal} className="space-y-6">
          <label className="block border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-10 text-center cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors bg-white dark:bg-gray-900">
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files[0])}
            />
            {file ? (
              <div className="space-y-1">
                <span className="text-2xl block">📄</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {file.name}
                </span>
                <span className="text-xs text-gray-400 block">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-3xl block">📤</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                  Click to select PDF paper
                </span>
                <span className="text-xs text-gray-400 block">
                  Supports scanned and digital PDFs (max 20 MB)
                </span>
              </div>
            )}
          </label>

          <button
            type="submit"
            disabled={!file || loading}
            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3.5 rounded-xl text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {loading ? "Extracting metadata…" : "Extract Metadata →"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmitFinal} className="space-y-5">
          {/* Exact Duplicate Warning */}
          {exactDuplicate && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300">
              <div className="font-semibold mb-1">🚫 Duplicate Paper Detected</div>
              <p>
                An identical paper content already exists for branch <strong>{exactDuplicate.branch}</strong>:{" "}
                <Link to={`/paper/${exactDuplicate._id}`} className="underline font-medium">
                  {exactDuplicate.title} ({exactDuplicate.year})
                </Link>
              </p>
            </div>
          )}

          {/* Similarity Candidate Warning Banner */}
          {!exactDuplicate && similarityCandidates.length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-200">
              <div className="font-semibold mb-1">⚠️ Similar Papers Exist</div>
              <p className="mb-2">
                We found similar papers for <strong>{form.branch}</strong>. Please check to avoid duplicates:
              </p>
              <div className="space-y-1">
                {similarityCandidates.map((c) => (
                  <Link
                    key={c._id}
                    to={`/paper/${c._id}`}
                    target="_blank"
                    className="block hover:underline text-amber-900 dark:text-amber-100 font-medium"
                  >
                    • {c.title} ({c.year} - {c.examType}) ↗
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Gemini Fallback Trigger Banner */}
          <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-900 rounded-xl text-xs border border-gray-200 dark:border-gray-800">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Extraction Source: {extractionSource === "gemini" ? "✨ Gemini AI" : "⚙️ Local OCR"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleGeminiFallback}
              disabled={geminiLoading}
              className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline disabled:opacity-50"
            >
              {geminiLoading ? "Running Gemini AI…" : "Not correct? Try Gemini AI ✨"}
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Paper Title {getConfBadge("courseTitle")}
            </label>
            <input
              className={inp}
              placeholder="Paper title e.g. DBMS End Sem 2024"
              value={form.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Branch {getConfBadge("branch")}
              </label>
              <select
                className={inp}
                value={form.branch}
                onChange={(e) => handleFieldChange("branch", e.target.value)}
                required
              >
                <option value="">Select Branch</option>
                {branches.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.code} — {b.fullName}
                  </option>
                ))}
                <option value="OTHER">Other / not listed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Semester {getConfBadge("semester")}
              </label>
              <select
                className={inp}
                value={form.semester}
                onChange={(e) => handleFieldChange("semester", e.target.value)}
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
          </div>

          {/* Unlisted Branch Text Field */}
          {form.branch === "OTHER" && (
            <div>
              <label className="block text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                Specify Unlisted Branch Name (Flagged for Admin Review)
              </label>
              <input
                className={inp}
                placeholder="e.g. AI & Data Science"
                value={form.pendingBranchName}
                onChange={(e) => handleFieldChange("pendingBranchName", e.target.value)}
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Subject Name {getConfBadge("subject")}
            </label>
            <input
              className={inp}
              placeholder="Subject name"
              value={form.subject}
              onChange={(e) => handleFieldChange("subject", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Course Code {getConfBadge("courseCode")}
              </label>
              <input
                className={inp}
                placeholder="e.g. CS-301"
                value={form.courseCode}
                onChange={(e) => handleFieldChange("courseCode", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Degree Program {getConfBadge("degree")}
              </label>
              <input
                className={inp}
                placeholder="e.g. B.Tech"
                value={form.degree}
                onChange={(e) => handleFieldChange("degree", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Year {getConfBadge("year")}
              </label>
              <select
                className={inp}
                value={form.year}
                onChange={(e) => handleFieldChange("year", e.target.value)}
                required
              >
                <option value="">Year</option>
                {YEARS.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Exam Type {getConfBadge("examType")}
              </label>
              <select
                className={inp}
                value={form.examType}
                onChange={(e) => handleFieldChange("examType", e.target.value)}
                required
              >
                <option value="">Exam type</option>
                {EXAM_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={loading || !!exactDuplicate}
              className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity"
            >
              {loading ? "Publishing…" : "Submit & Publish Paper 🚀"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
