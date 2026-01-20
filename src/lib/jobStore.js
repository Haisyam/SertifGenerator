import crypto from "node:crypto";

const store = globalThis.__sertifJobs ?? new Map();
globalThis.__sertifJobs = store;

export const createJob = (data) => {
  const id = crypto.randomUUID();
  store.set(id, {
    id,
    status: "processing",
    total: 0,
    current: 0,
    error: null,
    zipPath: null,
    tempTargets: [],
    ...data,
  });
  return id;
};

export const getJob = (id) => store.get(id);

export const updateJob = (id, patch) => {
  const job = store.get(id);
  if (!job) return null;
  const next = { ...job, ...patch };
  store.set(id, next);
  return next;
};

export const removeJob = (id) => {
  store.delete(id);
};
