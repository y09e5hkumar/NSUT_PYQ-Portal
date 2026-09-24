import { useState, useEffect } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { useNavigate, Link } from "react-router-dom";

const EXAM_TYPES = ["Mid Sem", "End Sem", "Summer Sem"];
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2014 }, (_, i) => CURRENT_YEAR - i);

const NOT_LISTED = "__NOT_LISTED__";

const inp =
  "w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

const label = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5";

export default function Upload() {
  const navigate = useNavigate();

  // ── File ─────────────────────────────────────────────────────────────────────
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // ── Taxonomy data ─────────────────────────────────────────────────────────────
  const [branches, setBranches] = useState([]);
  const [courseTitles, setCourseTitles] = useState([]);
  const [courseCodes, setCourseCodes] = useState([]);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [degree] = useState("B.Tech");

  // Branch
  const [branchValue, setBranchValue] = useState("");   // dropdown value ("CSE" | NOT_LISTED | "")
  const [branchIsNew, setBranchIsNew] = useState(false);
  const [pendingBranchName, setPendingBranchName] = useState("");

  // Semester
  const [semester, setSemester] = useState("");

  // Course Title
  const [courseTitleValue, setCourseTitleValue] = useState(""); // dropdown value (name | NOT_LISTED | "")
  const [courseTitleId, setCourseTitleId] = useState(null);     // _id of chosen existing course title
  const [courseTitleIsNew, setCourseTitleIsNew] = useState(false);
  const [pendingCourseTitleName, setPendingCourseTitleName] = useState("");

  // Course Code
  const [courseCodeValue, setCourseCodeValue] = useState(""); // dropdown value (code | NOT_LISTED | "")
  const [courseCodeIsNew, setCourseCodeIsNew] = useState(false);
  const [pendingCourseCodeName, setPendingCourseCodeName] = useState("");

  // Exam / Year
  const [examType, setExamType] = useState("");
  const [year, setYear] = useState("");

  // ── Duplicate pre-check ───────────────────────────────────────────────────────
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // ── Load branches ─────────────────────────────────────────────────────────────
  useEffect(() => {
    api.get("/branches").then((r) => {
      if (Array.isArray(r.data)) setBranches(r.data);
    }).catch(() => {});
  }, []);

  // ── Load Course Titles when branch changes ────────────────────────────────────
  const resolvedBranch = branchIsNew ? null : branchValue;
  useEffect(() => {
    // Reset downstream fields
    setCourseTitleValue("");
    setCourseTitleId(null);
    setCourseTitleIsNew(false);
    setPendingCourseTitleName("");
    setCourseCodes([]);
    setCourseCodeValue("");
    setCourseCodeIsNew(false);
    setPendingCourseCodeName("");

    if (!resolvedBranch) {
      setCourseTitles([]);
      return;
    }
    api.get(`/course-titles?branch=${resolvedBranch}`).then((r) => {
      setCourseTitles(Array.isArray(r.data) ? r.data : []);
    }).catch(() => setCourseTitles([]));
  }, [resolvedBranch]);

  // ── Load Course Codes when Course Title changes ───────────────────────────────
  useEffect(() => {
    setCourseCodeValue("");
    setCourseCodeIsNew(false);
    setPendingCourseCodeName("");

    if (!courseTitleId || courseTitleIsNew) {
      setCourseCodes([]);
      return;
    }
    api.get(`/course-codes?courseTitleId=${courseTitleId}`).then((r) => {
      setCourseCodes(Array.isArray(r.data) ? r.data : []);
    }).catch(() => setCourseCodes([]));
  }, [courseTitleId, courseTitleIsNew]);

  // ── Duplicate pre-check ───────────────────────────────────────────────────────
  useEffect(() => {
    const branch = resolvedBranch;
    const currentTitle = courseTitleIsNew ? pendingCourseTitleName : (courseTitleValue !== NOT_LISTED ? courseTitleValue : "");
    const currentCode = (courseTitleIsNew || courseCodeIsNew) ? pendingCourseCodeName : (courseCodeValue !== NOT_LISTED ? courseCodeValue : "");

    if (!branch || !semester || !currentTitle || !examType || !year) {
      setDuplicateWarning(null);
      return;
    }
    if (branchIsNew || courseTitleIsNew || courseCodeIsNew) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { data } = await api.post("/papers/check-duplicate", {
          branch,
          semester,
          courseTitle: currentTitle,
          courseCode: currentCode,
          examType,
          year,
        });
        setDuplicateWarning(data.isDuplicate ? data.existingPaper : null);
      } catch {
        setDuplicateWarning(null);
      }
    }, 600);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedBranch, semester, courseTitleValue, pendingCourseTitleName, courseTitleIsNew, courseCodeValue, pendingCourseCodeName, courseCodeIsNew, examType, year]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleBranchChange = (e) => {
    const val = e.target.value;
    if (val === NOT_LISTED) {
      setBranchIsNew(true);
      setBranchValue(NOT_LISTED);
    } else {
      setBranchIsNew(false);
      setBranchValue(val);
      setPendingBranchName("");
    }
  };

  const handleCourseTitleChange = (e) => {
    const val = e.target.value;
    if (val === NOT_LISTED) {
      setCourseTitleIsNew(true);
      setCourseTitleValue(NOT_LISTED);
      setCourseTitleId(null);
      // When Course Title is not listed, course code is ALSO required to be entered manually
      setCourseCodeIsNew(true);
      setCourseCodeValue(NOT_LISTED);
    } else {
      setCourseTitleIsNew(false);
      setCourseTitleValue(val);
      const found = courseTitles.find((c) => c.name === val);
      setCourseTitleId(found?._id || null);
      setPendingCourseTitleName("");
      setCourseCodeIsNew(false);
      setCourseCodeValue("");
      setPendingCourseCodeName("");
    }
  };

  const handleCourseCodeChange = (e) => {
    const val = e.target.value;
    if (val === NOT_LISTED) {
      setCourseCodeIsNew(true);
      setCourseCodeValue(NOT_LISTED);
    } else {
      setCourseCodeIsNew(false);
      setCourseCodeValue(val);
      setPendingCourseCodeName("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!file) return toast.error("Please attach a PDF file.");
    if (!semester) return toast.error("Semester is required.");
    if (!examType) return toast.error("Exam type is required.");
    if (!year) return toast.error("Year is required.");

    if (!branchIsNew && !branchValue) return toast.error("Branch is required.");
    if (branchIsNew && !pendingBranchName.trim()) return toast.error("Please specify your unlisted branch name.");

    if (courseTitleIsNew) {
      if (!pendingCourseTitleName.trim()) return toast.error("New course title is required.");
      if (!pendingCourseCodeName.trim()) return toast.error("New course code is required when adding a new title.");
    } else {
      if (!courseTitleValue || courseTitleValue === NOT_LISTED) return toast.error("Course title is required.");
      if (courseCodeIsNew && !pendingCourseCodeName.trim()) return toast.error("Please specify the new course code.");
      if (!courseCodeIsNew && !courseCodeValue) return toast.error("Course code is required.");
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("pdf", file);
      fd.append("degree", degree);
      fd.append("semester", semester);
      fd.append("examType", examType);
      fd.append("year", year);

      // Branch
      fd.append("branchIsNew", String(branchIsNew));
      if (branchIsNew) {
        fd.append("pendingBranchName", pendingBranchName.trim());
      } else {
        fd.append("branch", branchValue);
      }

      // Course Title & Course Code
      fd.append("courseTitleIsNew", String(courseTitleIsNew));
      if (courseTitleIsNew) {
        fd.append("pendingCourseTitleName", pendingCourseTitleName.trim());
        fd.append("courseCodeIsNew", "true");
        fd.append("pendingCourseCodeName", pendingCourseCodeName.trim().toUpperCase());
      } else {
        fd.append("courseTitle", courseTitleValue);
        fd.append("courseCodeIsNew", String(courseCodeIsNew));
        if (courseCodeIsNew) {
          fd.append("pendingCourseCodeName", pendingCourseCodeName.trim().toUpperCase());
        } else {
          fd.append("courseCode", courseCodeValue);
        }
      }

      await api.post("/papers", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Paper published successfully! 🎉");
      navigate("/");
    } catch (err) {
      if (err.response?.status === 409) {
        const existing = err.response.data?.existingPaper;
        if (existing) {
          toast.error(
            <span>
              Duplicate detected!{" "}
              <Link to={`/paper/${existing._id}`} className="underline font-medium">
                View existing paper
              </Link>
            </span>,
            { duration: 6000 }
          );
        } else {
          toast.error("This paper has already been uploaded.");
        }
      } else {
        toast.error(err.response?.data?.message || "Upload failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const branchResolved = !branchIsNew && !!branchValue;

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Upload a Paper</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Fill in the details below. All fields marked <span className="text-red-500">*</span> are required.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Duplicate warning banner ── */}
        {duplicateWarning && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200">
            <div className="font-semibold mb-1">⚠️ This paper may already exist</div>
            <p>
              A paper matching this branch / semester / course title / exam type / year was found:{" "}
              <Link to={`/paper/${duplicateWarning._id}`} target="_blank" className="underline font-medium">
                {duplicateWarning.courseTitle} ({duplicateWarning.examType} {duplicateWarning.year}) ↗
              </Link>
            </p>
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              You can still submit if your paper is genuinely different.
            </p>
          </div>
        )}

        {/* ── Degree (fixed) ── */}
        <div>
          <label className={label}>Degree Program</label>
          <input className={inp} value={degree} readOnly />
        </div>

        {/* ── Branch ── */}
        <div>
          <label className={label}>
            Branch <span className="text-red-500">*</span>
          </label>
          <select id="branch-select" className={inp} value={branchValue} onChange={handleBranchChange} required={!branchIsNew}>
            <option value="">Select branch…</option>
            {branches.map((b) => (
              <option key={b.code} value={b.code}>
                {b.code} — {b.fullName}
              </option>
            ))}
            <option value={NOT_LISTED}>Not listed / add new</option>
          </select>
        </div>

        {branchIsNew && (
          <div>
            <label className="block text-xs font-medium text-amber-600 dark:text-amber-400 mb-1.5">
              Specify unlisted branch name <span className="text-red-500">*</span>{" "}
              <span className="font-normal">(will be reviewed by admin)</span>
            </label>
            <input
              id="pending-branch-input"
              className={inp}
              placeholder="e.g. AI & Data Science"
              value={pendingBranchName}
              onChange={(e) => setPendingBranchName(e.target.value)}
              required
            />
          </div>
        )}

        {/* ── Semester ── */}
        <div>
          <label className={label}>
            Semester <span className="text-red-500">*</span>
          </label>
          <select id="semester-select" className={inp} value={semester} onChange={(e) => setSemester(e.target.value)} required>
            <option value="">Select semester…</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>Sem {s}</option>
            ))}
          </select>
        </div>

        {/* ── Course Title (cascades from Branch) ── */}
        <div>
          <label className={label}>
            Course Title <span className="text-red-500">*</span>
          </label>
          <select
            id="course-title-select"
            className={inp}
            value={courseTitleValue}
            onChange={handleCourseTitleChange}
            disabled={!branchResolved}
            required={!courseTitleIsNew}
          >
            <option value="">{branchResolved ? "Select course title…" : "Select branch first"}</option>
            {courseTitles.map((c) => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
            <option value={NOT_LISTED}>Not listed / add new</option>
          </select>
        </div>

        {/* ── Paired New Course Title + New Course Code inputs ── */}
        {courseTitleIsNew ? (
          <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-4">
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              📌 Add New Course (Submitted together for Admin Review)
            </div>
            <div>
              <label className="block text-xs font-medium text-amber-700 dark:text-amber-300 mb-1.5">
                New Course Title <span className="text-red-500">*</span>
              </label>
              <input
                id="pending-course-title-input"
                className={inp}
                placeholder="e.g. Software Quality Assurance"
                value={pendingCourseTitleName}
                onChange={(e) => setPendingCourseTitleName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-amber-700 dark:text-amber-300 mb-1.5">
                New Course Code <span className="text-red-500">*</span>
              </label>
              <input
                id="pending-course-code-input"
                className={inp}
                placeholder="e.g. CS-702"
                value={pendingCourseCodeName}
                onChange={(e) => setPendingCourseCodeName(e.target.value.toUpperCase())}
                required
              />
            </div>
          </div>
        ) : (
          /* ── Course Code (dropdown for existing course title) ── */
          <div>
            <label className={label}>
              Course Code <span className="text-red-500">*</span>
            </label>
            <select
              id="course-code-select"
              className={inp}
              value={courseCodeValue}
              onChange={handleCourseCodeChange}
              disabled={!courseTitleValue || courseTitleValue === NOT_LISTED}
              required={!courseCodeIsNew}
            >
              <option value="">
                {courseTitleValue && courseTitleValue !== NOT_LISTED
                  ? "Select course code…"
                  : "Select course title first"}
              </option>
              {courseCodes.map((c) => (
                <option key={c._id} value={c.code}>{c.code}</option>
              ))}
              {courseTitleValue && courseTitleValue !== NOT_LISTED && (
                <option value={NOT_LISTED}>Not listed / add new</option>
              )}
            </select>
          </div>
        )}

        {courseCodeIsNew && !courseTitleIsNew && (
          <div>
            <label className="block text-xs font-medium text-amber-600 dark:text-amber-400 mb-1.5">
              Specify unlisted course code <span className="text-red-500">*</span>{" "}
              <span className="font-normal">(will be reviewed by admin)</span>
            </label>
            <input
              id="pending-course-code-standalone-input"
              className={inp}
              placeholder="e.g. CS-601"
              value={pendingCourseCodeName}
              onChange={(e) => setPendingCourseCodeName(e.target.value.toUpperCase())}
              required
            />
          </div>
        )}

        {/* ── Exam type + Year ── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>
              Exam Type <span className="text-red-500">*</span>
            </label>
            <select id="exam-type-select" className={inp} value={examType} onChange={(e) => setExamType(e.target.value)} required>
              <option value="">Select…</option>
              {EXAM_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>
              Year <span className="text-red-500">*</span>
            </label>
            <select id="year-select" className={inp} value={year} onChange={(e) => setYear(e.target.value)} required>
              <option value="">Select…</option>
              {YEARS.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── PDF File ── */}
        <div>
          <label className={label}>
            PDF File <span className="text-red-500">*</span>
          </label>
          <label
            htmlFor="pdf-file-input"
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors bg-white dark:bg-gray-900"
          >
            <input
              id="pdf-file-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files[0])}
            />
            {file ? (
              <div className="space-y-1">
                <span className="text-2xl block">📄</span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</span>
                <span className="text-xs text-gray-400 block">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-3xl block">📤</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                  Click to select PDF
                </span>
                <span className="text-xs text-gray-400 block">Scanned or digital PDFs · max 20 MB</span>
              </div>
            )}
          </label>
        </div>

        {/* ── Pending fields notice ── */}
        {(branchIsNew || courseTitleIsNew || courseCodeIsNew) && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-700 dark:text-indigo-300">
            <span className="font-semibold">ℹ️ Note:</span> Your paper will publish immediately but{" "}
            {[branchIsNew && "branch", courseTitleIsNew && "course title + code", courseCodeIsNew && !courseTitleIsNew && "course code"]
              .filter(Boolean)
              .join(", ")}{" "}
            will be reviewed by an admin. The paper won't appear in filtered search results until resolved.
          </div>
        )}

        {/* ── Submit ── */}
        <button
          id="upload-submit-btn"
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3.5 rounded-xl text-sm font-medium hover:opacity-80 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Publishing…
            </>
          ) : (
            "Submit & Publish Paper 🚀"
          )}
        </button>
      </form>
    </div>
  );
}
