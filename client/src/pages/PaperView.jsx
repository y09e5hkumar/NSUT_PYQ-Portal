import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function PaperView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paper, setPaper] = useState(null);
  const [related, setRelated] = useState([]);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    api.get(`/papers/${id}`).then(r => {
      setPaper(r.data);
      api.get('/papers', {
        params: { subject: r.data.subject, branch: r.data.branch }
      }).then(res =>
        setRelated(res.data.papers.filter(p => p._id !== id).slice(0, 4))
      );
    });
  }, [id]);

  const handleDownload = async () => {
    if (!user) {
      toast.error('Please login to download papers');
      navigate('/login');
      return;
    }
    await api.patch(`/papers/${id}/download`);
    const link = document.createElement('a');
    link.href = paper.pdfUrl;
    link.setAttribute('download', `${paper.title}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

  if (!paper) return (
    <div className="text-center mt-20 text-gray-400">Loading…</div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <Link to="/" className="text-sm text-gray-400 hover:text-gray-600 mb-6 inline-block">
        ← Back to results
      </Link>

      {/* Paper info */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold mb-2">{paper.title}</h1>
            <div className="flex flex-wrap gap-2">
              {[paper.branch, `Sem ${paper.semester}`, paper.subject, paper.year, paper.examType].map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          {user ? (
            <button
              onClick={handleDownload}
              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
            >
              ↓ Download PDF
            </button>
          ) : (
            <Link
              to="/login"
              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
            >
              🔒 Login to download
            </Link>
          )}
        </div>
        <p className="text-xs text-gray-400">↓ {paper.downloads} downloads</p>
      </div>

      {/* PDF Preview */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-sm font-medium flex items-center justify-between">
          <span>Preview {user ? `— Page ${pageNumber} of ${numPages || '?'}` : ''}</span>
          {user && (
            <div className="flex items-center gap-2">
              <button
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber(p => p - 1)}
                className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded disabled:opacity-40"
              >
                ← Prev
              </button>
              <button
                disabled={pageNumber >= numPages}
                onClick={() => setPageNumber(p => p + 1)}
                className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded disabled:opacity-40"
              >
                Next →
              </button>
              <a
                href={paper.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-gray-400 hover:text-gray-600 ml-2"
              >
                Open ↗
              </a>
            </div>
          )}
        </div>

        <div
          className="flex justify-center p-4 overflow-auto bg-gray-50 dark:bg-gray-950"
          style={{ maxHeight: '70vh' }}
        >
          {pdfError?(

            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-gray-400 text-sm">Preview not available.</p>
              <a
                href={paper.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-lg"
              >
                Open PDF in new tab ↗
              </a>
            </div>
          ) : (
            <Document
              file={paper.pdfUrl}
              onLoadSuccess={({ numPages }) => {
                setNumPages(numPages);
                setPdfError(false);
              }}
              onLoadError={() => setPdfError(true)}
              loading={
                <div className="text-gray-400 text-sm py-16">Loading preview…</div>
              }
            >
              <Page
                pageNumber={pageNumber}
                width={Math.min(600, window.innerWidth - 80)}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          )}
        </div>
      </div>

      {/* Related papers */}
      {related.length > 0 && (
        <div>
          <h2 className="font-medium mb-3">Related papers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {related.map(p => (
              <Link
                key={p._id}
                to={`/paper/${p._id}`}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 hover:border-gray-400 transition-colors text-sm"
              >
                <div className="font-medium mb-1">{p.title}</div>
                <div className="text-gray-400 text-xs">
                  {p.examType} · {p.year} · ↓ {p.downloads}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}