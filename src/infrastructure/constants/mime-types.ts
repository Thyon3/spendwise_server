export const MimeTypes = {
  // Images
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  GIF: 'image/gif',
  WEBP: 'image/webp',
  SVG: 'image/svg+xml',

  // Documents
  PDF: 'application/pdf',
  DOC: 'application/msword',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  XLS: 'application/vnd.ms-excel',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  // Text
  TEXT: 'text/plain',
  HTML: 'text/html',
  CSS: 'text/css',
  CSV: 'text/csv',
  JSON: 'application/json',
  XML: 'application/xml',

  // Archives
  ZIP: 'application/zip',
  RAR: 'application/x-rar-compressed',

  // Other
  OCTET_STREAM: 'application/octet-stream',
} as const;
