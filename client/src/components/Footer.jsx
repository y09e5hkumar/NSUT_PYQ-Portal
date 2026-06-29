export default function Footer() {
  return (
    <footer className="sticky bottom-0 z-40 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-3">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-gray-400">
        <span>© 2026 NSUT PYQ Portal. All rights reserved.</span>
        <span>
          Designed & Developed by{" "}
          <span className="text-gray-600 dark:text-gray-300 font-medium">
            Yogesh Kumar
          </span>
        </span>
      </div>
    </footer>
  );
}
