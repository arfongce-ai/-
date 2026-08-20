#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const PROJECT = "momgagym-poomsae-coach";
const DATABASE = "(default)";
const sourcePath = process.argv[2];

function credentialPaths() {
  return [
    process.env.XDG_CONFIG_HOME && path.join(process.env.XDG_CONFIG_HOME, "configstore", "firebase-tools.json"),
    path.join(os.homedir(), ".config", "configstore", "firebase-tools.json"),
    process.env.APPDATA && path.join(process.env.APPDATA, "configstore", "firebase-tools.json"),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "configstore", "firebase-tools.json")
  ].filter(Boolean);
}

function findAccessToken(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return null;
  seen.add(value);
  if (typeof value.access_token === "string" && value.access_token.length > 20) return value.access_token;
  for (const child of Object.values(value)) {
    const token = findAccessToken(child, seen);
    if (token) return token;
  }
  return null;
}

function accessToken() {
  for (const candidate of credentialPaths()) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const token = findAccessToken(JSON.parse(fs.readFileSync(candidate, "utf8")));
      if (token) return token;
    } catch (_) {
      // Try the next standard Firebase CLI credential location.
    }
  }
  throw new Error("Firebase CLI 로그인 정보를 찾지 못했습니다. firebase login 후 다시 실행하세요.");
}

function firestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("NaN 또는 Infinity는 저장할 수 없습니다.");
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (value && typeof value === "object") {
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firestoreValue(item)])) } };
  }
  throw new Error(`지원하지 않는 값 형식: ${typeof value}`);
}

function validate(record) {
  if (!record || record.action !== "adjust") throw new Error("adjust 검수 기록만 가져올 수 있습니다.");
  if (!/^taegeuk_[1-8]$|^(koryo|keumgang|taebaek|pyongwon|sipjin|jitae|cheonkwon|hansu|ilyeo)$/.test(record.poomsae || "")) {
    throw new Error("지원하는 품새 ID가 아닙니다.");
  }
  if (record.review_status !== "gpt_reviewed" || record.explicit_review !== true || record.trusted_provenance !== true) {
    throw new Error("명시적으로 GPT 검수된 신뢰 출처 기록이 아닙니다.");
  }
  if (!Array.isArray(record.result_boundary_ratios)
    || record.result_boundary_ratios.length !== record.boundary_count
    || record.result_boundary_ratios.some((value, index, values) =>
      !Number.isFinite(value) || value < 0 || value > 1 || (index > 0 && value <= values[index - 1]))) {
    throw new Error("경계 비율이 유효하지 않습니다.");
  }
  if (!record.review_session_id) throw new Error("review_session_id가 없습니다.");
}

async function main() {
  if (!sourcePath) throw new Error("사용법: node scripts/import-calibration-review.js <ground-truth.json>");
  const source = JSON.parse(fs.readFileSync(path.resolve(sourcePath), "utf8"));
  const record = source.calibration_record || source;
  validate(record);

  const documentId = String(record.review_session_id).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120);
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/${encodeURIComponent(DATABASE)}/documents`;
  const token = accessToken();
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const existing = await fetch(`${base}/calibration_reviews/${encodeURIComponent(documentId)}`, { headers });
  if (existing.ok) {
    console.log(`이미 등록됨: calibration_reviews/${documentId}`);
    return;
  }
  if (existing.status !== 404) throw new Error(`기존 문서 확인 실패: ${existing.status} ${await existing.text()}`);

  const payload = {
    ...record,
    evidence_schema: "poomsae-calibration-evidence-v2",
    imported_at: new Date().toISOString()
  };
  const response = await fetch(`${base}/calibration_reviews?documentId=${encodeURIComponent(documentId)}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, firestoreValue(value)])) })
  });
  if (!response.ok) throw new Error(`가져오기 실패: ${response.status} ${await response.text()}`);
  console.log(`등록 완료: calibration_reviews/${documentId}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
