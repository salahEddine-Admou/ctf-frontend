import { useState, useEffect } from 'react';
import { FileText, ExternalLink, Download } from 'lucide-react';

export const getDocumentType = (url, name) => {
  const source = (name || url || '').toLowerCase();
  if (source.includes('.pdf') || source.includes('/pdf') || source.includes('format=pdf')) return 'pdf';
  if (/\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(source)) return 'image';
  return 'other';
};

const getPdfPreviewUrl = (url) =>
  `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

export default function DocumentPreview({ document, className = '' }) {
  const [iframeError, setIframeError] = useState(false);
  useEffect(() => setIframeError(false), [document?.url]);

  if (!document?.url) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[280px] bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 text-sm ${className}`}>
        <FileText className="w-10 h-10 mb-2 opacity-50" />
        <p>Sélectionnez un document pour l'aperçu</p>
      </div>
    );
  }

  const type = getDocumentType(document.url, document.name);
  const pdfSrc = iframeError ? null : getPdfPreviewUrl(document.url);

  return (
    <div className={`rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-900/50 ${className}`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium truncate flex-1" title={document.name}>{document.name}</p>
        <div className="flex gap-1 shrink-0">
          <a href={document.url} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Ouvrir">
            <ExternalLink className="w-4 h-4" />
          </a>
          <a href={document.url} download={document.name} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="Télécharger">
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="min-h-[320px] max-h-[480px] overflow-auto">
        {type === 'pdf' && (
          <>
            {pdfSrc && !iframeError ? (
              <iframe
                src={pdfSrc}
                title={document.name}
                className="w-full h-[420px] bg-white"
              />
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[280px] p-6 text-center text-sm text-gray-500">
                <FileText className="w-12 h-12 mb-3 text-nfc-red opacity-70" />
                <p className="mb-3">Aperçu PDF — ouvrez le fichier dans un nouvel onglet.</p>
                <a href={document.url} target="_blank" rel="noreferrer" className="btn-primary text-sm">
                  Ouvrir le PDF
                </a>
              </div>
            )}
          </>
        )}
        {type === 'image' && (
          <div className="flex items-center justify-center p-4 min-h-[320px]">
            <img src={document.url} alt={document.name} className="max-w-full max-h-[440px] object-contain rounded" />
          </div>
        )}
        {type === 'other' && (
          <div className="flex flex-col items-center justify-center min-h-[280px] p-6 text-center text-sm text-gray-500">
            <FileText className="w-12 h-12 mb-3 text-nfc-red opacity-70" />
            <p className="mb-3">Aperçu non disponible pour ce type de fichier.</p>
            <a href={document.url} target="_blank" rel="noreferrer" className="btn-primary text-sm">
              Ouvrir le document
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
