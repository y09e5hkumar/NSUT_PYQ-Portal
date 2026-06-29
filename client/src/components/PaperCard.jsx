import { Link } from "react-router-dom";

const EXAM_COLORS = {
  "End Sem": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "Mid Sem": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Back Paper":
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  Quiz: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export default function PaperCard({ paper }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-gray-400 dark:hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-medium text-sm leading-snug">{paper.title}</h3>
        <span
          className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap font-medium ${
            EXAM_COLORS[paper.examType]
          }`}
        >
          {paper.examType}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400">
          {paper.branch}
        </span>
        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400">
          Sem {paper.semester}
        </span>
        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400">
          {paper.year}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          ↓ {paper.downloads} downloads
        </span>
        <Link
          to={`/paper/${paper._id}`}
          className="text-xs bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
        >
          View →
        </Link>
      </div>
    </div>
  );
}
