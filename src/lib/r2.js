import crypto from "node:crypto";

const required = [
  "R2_ACCOUNT_ID",
  "R2_BUCKET_NAME",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
];

const service = "s3";
const region = "auto";

const ensureEnv = () => {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`R2 env belum lengkap: ${missing.join(", ")}`);
  }
};

const endpointHost = () => `${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const amzDate = (date = new Date()) => {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { full: iso, short: iso.slice(0, 8) };
};

const sha256Hex = (input) =>
  crypto.createHash("sha256").update(input).digest("hex");

const hmac = (key, input, encoding) =>
  crypto.createHmac("sha256", key).update(input).digest(encoding);

const getSigningKey = (secret, dateStamp) => {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
};

const encodeRfc3986 = (value) =>
  encodeURIComponent(value).replace(/[!*'()]/g, (ch) =>
    `%${ch.charCodeAt(0).toString(16).toUpperCase()}`
  );

const encodeKeyPath = (key) =>
  key
    .split("/")
    .map((segment) => encodeRfc3986(segment))
    .join("/");

const canonicalQueryString = (query) =>
  Object.entries(query)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(String(v))}`)
    .join("&");

const signedHeaders = "host";

const getScope = (dateStamp) => `${dateStamp}/${region}/${service}/aws4_request`;

const getCanonicalUri = (bucket, key) => `/${bucket}/${encodeKeyPath(key)}`;

const getAuthHeaders = ({ method, key, payloadHash }) => {
  ensureEnv();
  const host = endpointHost();
  const bucket = process.env.R2_BUCKET_NAME;
  const now = amzDate();
  const scope = getScope(now.short);
  const canonicalUri = getCanonicalUri(bucket, key);
  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = [
    method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    now.full,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = getSigningKey(process.env.R2_SECRET_ACCESS_KEY, now.short);
  const signature = hmac(signingKey, stringToSign, "hex");
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${process.env.R2_ACCESS_KEY_ID}/${scope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  return {
    host,
    now,
    authorization,
    canonicalUri,
  };
};

const r2Url = (key) => {
  const host = endpointHost();
  const bucket = process.env.R2_BUCKET_NAME;
  return `https://${host}/${bucket}/${encodeKeyPath(key)}`;
};

export const createR2Key = (prefix, filename = "file.bin") => {
  const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${prefix}/${crypto.randomUUID()}-${safe}`.replace(/\/+/g, "/");
};

export const uploadBufferToR2 = async ({ key, body, contentType }) => {
  const payloadHash = sha256Hex(body);
  const auth = getAuthHeaders({ method: "PUT", key, payloadHash });
  const res = await fetch(r2Url(key), {
    method: "PUT",
    headers: {
      Host: auth.host,
      Authorization: auth.authorization,
      "x-amz-date": auth.now.full,
      "x-amz-content-sha256": payloadHash,
      "content-type": contentType || "application/octet-stream",
    },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(`Upload R2 gagal (${res.status}): ${message || "unknown error"}`);
  }
  return key;
};

export const getBufferFromR2 = async (key) => {
  const payloadHash = sha256Hex("");
  const auth = getAuthHeaders({ method: "GET", key, payloadHash });
  const res = await fetch(r2Url(key), {
    method: "GET",
    headers: {
      Host: auth.host,
      Authorization: auth.authorization,
      "x-amz-date": auth.now.full,
      "x-amz-content-sha256": payloadHash,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(`Ambil file R2 gagal (${res.status}): ${message || "unknown error"}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

export const getSignedDownloadUrl = async (key, expiresIn = 900) => {
  ensureEnv();
  const host = endpointHost();
  const bucket = process.env.R2_BUCKET_NAME;
  const now = amzDate();
  const scope = getScope(now.short);
  const canonicalUri = getCanonicalUri(bucket, key);
  const query = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${process.env.R2_ACCESS_KEY_ID}/${scope}`,
    "X-Amz-Date": now.full,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": signedHeaders,
  };
  const canonicalQuery = canonicalQueryString(query);
  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    now.full,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = getSigningKey(process.env.R2_SECRET_ACCESS_KEY, now.short);
  const signature = hmac(signingKey, stringToSign, "hex");
  const finalQuery = `${canonicalQuery}&X-Amz-Signature=${signature}`;
  return `https://${host}${canonicalUri}?${finalQuery}`;
};
