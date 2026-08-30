export const EMAIL_ATTACHMENT_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv,application/pdf,image/*,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";

const ALLOWED_EXT = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv"
]);

export type LocalEmailAttachment = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  contentBase64: string;
};

function extOf(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export function isAllowedEmailAttachment(file: File) {
  const ext = extOf(file.name);
  if (ALLOWED_EXT.has(ext)) return true;
  const t = (file.type || "").toLowerCase();
  return (
    t.startsWith("image/") ||
    t === "application/pdf" ||
    t.includes("word") ||
    t.includes("excel") ||
    t.includes("spreadsheet") ||
    t === "text/csv"
  );
}

export function formatAttachmentSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function fileToEmailAttachment(file: File): Promise<LocalEmailAttachment> {
  if (!isAllowedEmailAttachment(file)) {
    throw new Error(`Unsupported file type: ${file.name}`);
  }
  if (file.size > 7 * 1024 * 1024) {
    throw new Error(`${file.name} is larger than 7MB.`);
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
  const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  return {
    id: crypto.randomUUID(),
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    size: file.size,
    contentBase64: base64
  };
}
