import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import FilterBar from "../components/FilterBar";
import PaperCard from "../components/PaperCard";

export default function Home() {
  const [papers, setPapers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ page: 1 });
  const [search, setSearch] = useState("");
  const [trending, setTrending] = useState([]);
  const [showTrending, setShowTrending] = useState(true);

  // fetch trending once
  useEffect(() => {
    api.get("/papers/trending").then((r) => setTrending(r.data));
  }, []);

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (search) params.search = search;
      const { data } = await api.get("/papers", { params });
      setPapers(data.papers);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  useEffect(() => {
    const t = setTimeout(fetchPapers, 300);
    return () => clearTimeout(t);
  }, [fetchPapers]);

  const hasFilters =
    search || Object.keys(filters).some((k) => k !== "page" && filters[k]);

  return (
    <div>
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">
          Find your PYQ <span className="text-gray-400">instantly</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Previous year question papers for all branches and semesters.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          🔍
        </span>
        <input
          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
          placeholder="Search by subject or paper title…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setShowTrending(!e.target.value);
            setFilters((f) => ({ ...f, page: 1 }));
          }}
        />
        {search && (
          <button
            onClick={() => {
              setSearch("");
              setShowTrending(true);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onChange={(f) => {
          setFilters(f);
          setShowTrending(false);
        }}
      />

      {/* Trending — show only when no search/filter active */}
      {showTrending && !hasFilters && trending.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium">🔥 Trending</span>
            <span className="text-xs text-gray-400">Most downloaded</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {trending.slice(0, 8).map((p) => (
              <Link
                key={p._id}
                to={`/paper/${p._id}`}
                className="text-xs px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
              >
                {p.subject} · {p.examType} {p.year}
                <span className="text-gray-400 ml-1">↓{p.downloads}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Results header */}
      {(hasFilters || !showTrending) && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-500">
            {total} paper{total !== 1 ? "s" : ""} found
          </span>
          <button
            onClick={() => {
              setFilters({ page: 1 });
              setSearch("");
              setShowTrending(true);
            }}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-36 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : papers.length === 0 && hasFilters ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-500 text-sm">
            No papers found for these filters.
          </p>
          <button
            onClick={() => {
              setFilters({ page: 1 });
              setSearch("");
              setShowTrending(true);
            }}
            className="mt-4 text-xs text-gray-400 underline hover:text-gray-600"
          >
            Clear filters
          </button>
        </div>
      ) : papers.length === 0 && !hasFilters ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">📄</div>
          <p className="text-gray-500 text-sm">No papers uploaded yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {papers.map((p) => (
              <PaperCard key={p._id} paper={p} />
            ))}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex justify-center items-center gap-3 mt-8">
              <button
                disabled={filters.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-500">
                Page {filters.page} of {Math.ceil(total / 20)}
              </span>
              <button
                disabled={filters.page * 20 >= total}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
