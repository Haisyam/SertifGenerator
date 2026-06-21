import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

const getStorageDir = () => {
  const envDir = process.env.LOCAL_STORAGE_DIR;
  if (envDir) {
    return path.resolve(envDir);
  }
  // Default to a folder named "storage" at the project root
  return path.resolve(process.cwd(), "storage");
};

export const storageDir = getStorageDir();

/**
 * Creates a unique path key for the storage.
 * Matches the original createR2Key signature.
 */
export const createStorageKey = (prefix, filename = "file.bin") => {
  const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${prefix}/${crypto.randomUUID()}-${safe}`.replace(/\/+/g, "/");
};

/**
 * Saves a file buffer to local disk.
 */
export const uploadBufferToStorage = async ({ key, body }) => {
  const targetPath = path.resolve(storageDir, key);

  // Security check: prevent directory traversal
  if (!targetPath.startsWith(storageDir)) {
    throw new Error("Akses penyimpanan tidak valid.");
  }

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, body);
  return key;
};

/**
 * Reads a file buffer from local disk.
 */
export const getBufferFromStorage = async (key) => {
  const targetPath = path.resolve(storageDir, key);

  // Security check: prevent directory traversal
  if (!targetPath.startsWith(storageDir)) {
    throw new Error("Akses penyimpanan tidak valid.");
  }

  return await fs.readFile(targetPath);
};

/**
 * Returns the download URL pointing to the local API endpoint.
 */
export const getDownloadUrl = (key) => {
  return `/api/download-file?key=${encodeURIComponent(key)}`;
};

/**
 * Deletes a file from local storage.
 */
export const deleteFileFromStorage = async (key) => {
  if (!key) return;
  try {
    const targetPath = path.resolve(storageDir, key);
    // Security check: prevent directory traversal
    if (!targetPath.startsWith(storageDir)) {
      throw new Error("Akses penyimpanan tidak valid.");
    }
    await fs.rm(targetPath, { force: true });
  } catch (error) {
    console.error(`Gagal menghapus file dengan key ${key}:`, error);
  }
};
