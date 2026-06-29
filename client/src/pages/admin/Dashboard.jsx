import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import api from "../../api/axios";

const isDark = () => document.documentElement.classList.contains("dark");

const chartTheme = () => ({
  grid: isDark() ? "#374151" : "#e5e7eb",
  tick: isDark() ? "#9ca3af" : "#6b7280",
  axis: isDark() ? "#4b5563" : "#d1d5db",
  tooltip: {
    backgroundColor: isDark() ? "#1f2937" : "#ffffff",
    border: isDark() ? "1px solid #374151" : "1px solid #e5e7eb",
    borderRadius: "8px",
    color: isDark() ? "#f9fafb" : "#111827",
  },
});

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [branchStats, setBranchStats] = useState([]);
  const [theme, setTheme] = useState(chartTheme());

  useEffect(() => {
    api.get("/papers/stats").then((r) => setStats(r.data));
    api.get("/papers/branch-stats").then((r) => setBranchStats(r.data));

    // update chart theme when dark mode changes
    const observer = new MutationObserver(() => setTheme(chartTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  if (!stats)
    return <div className="text-center mt-20 text-gray-400">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Admin dashboard</h1>
        <Link
          to="/admin/review"
          className="text-sm bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-4 py-2 rounded-xl"
        >
          Review queue ({stats.pending})
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total papers", value: stats.total, icon: "📄" },
          { label: "Pending review", value: stats.pending, icon: "⏳" },
          { label: "Total downloads", value: stats.totalDownloads, icon: "⬇️" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5"
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-3xl font-semibold mb-1">
              {s.value.toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top subjects chart */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="font-medium mb-4 text-sm">
            Top subjects by downloads
          </h2>
          {stats.topSubjects.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={stats.topSubjects.map((s) => ({
                  name: s._id,
                  downloads: s.downloads,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: theme.tick }}
                  axisLine={{ stroke: theme.axis }}
                  tickLine={{ stroke: theme.axis }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: theme.tick }}
                  axisLine={{ stroke: theme.axis }}
                  tickLine={{ stroke: theme.axis }}
                />
                <Tooltip contentStyle={theme.tooltip} />
                <Bar dataKey="downloads" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Branch wise papers chart */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="font-medium mb-4 text-sm">Papers per branch</h2>
          {branchStats.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={branchStats.map((b) => ({
                  name: b._id,
                  papers: b.count,
                  downloads: b.downloads,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: theme.tick }}
                  axisLine={{ stroke: theme.axis }}
                  tickLine={{ stroke: theme.axis }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: theme.tick }}
                  axisLine={{ stroke: theme.axis }}
                  tickLine={{ stroke: theme.axis }}
                />
                <Tooltip contentStyle={theme.tooltip} />
                <Bar
                  dataKey="papers"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  name="Papers"
                />
                <Bar
                  dataKey="downloads"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  name="Downloads"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top subjects list */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <h2 className="font-medium mb-4 text-sm">Subject leaderboard</h2>
        {stats.topSubjects.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            No downloads yet
          </div>
        ) : (
          <div className="space-y-3">
            {stats.topSubjects.map((s, i) => (
              <div key={s._id} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-5 text-right">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{s._id}</span>
                    <span className="text-gray-400">
                      {s.downloads} downloads
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <div
                      className="h-1.5 bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (s.downloads /
                            (stats.topSubjects[0]?.downloads || 1)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
