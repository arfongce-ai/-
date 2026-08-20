#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const SOURCE_PROJECT = "momgagym-cms";
const TARGET_PROJECT = "momgagym-poomsae-coach";
const DATABASE = "(default)";
const POOMSAE_COLLECTIONS = ["corrections", "calibration_reviews", "app_config"];
const mode = process.argv[2] || "--inventory";

function firebaseCredentialPaths() {
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

function loadAccessToken() {
  for (const candidate of firebaseCredentialPaths()) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const token = findAccessToken(JSON.parse(fs.readFileSync(candidate, "utf8")));
      if (token) return token;
    } catch (_) {
      // Try the next standard Firebase CLI credential location.
    }
  }
  throw new Error("Firebase CLI 로그인 정보를 찾지 못했습니다. 먼저 firebase login을 실행하세요.");
}

const accessToken = loadAccessToken();

function databaseBase(project) {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/${encodeURIComponent(DATABASE)}`;
}

function databaseResource(project) {
  return `projects/${project}/databases/${DATABASE}`;
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message = body?.error?.message || `${response.status} ${response.statusText}`;
    throw new Error(`${message} (${response.status})`);
  }
  return body;
}

async function listCollectionIds(project, parentDocument = "") {
  const suffix = parentDocument ? `/documents/${parentDocument}:listCollectionIds` : "/documents:listCollectionIds";
  const ids = [];
  let pageToken = "";
  do {
    const body = await api(`${databaseBase(project)}${suffix}`, {
      method: "POST",
      body: JSON.stringify({ pageSize: 1000, ...(pageToken ? { pageToken } : {}) })
    });
    ids.push(...(body.collectionIds || []));
    pageToken = body.nextPageToken || "";
  } while (pageToken);
  return ids.sort();
}

async function listDocuments(project, collectionPath) {
  const documents = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({ pageSize: "1000", showMissing: "false" });
    if (pageToken) params.set("pageToken", pageToken);
    const body = await api(`${databaseBase(project)}/documents/${collectionPath}?${params}`);
    documents.push(...(body.documents || []));
    pageToken = body.nextPageToken || "";
  } while (pageToken);
  return documents;
}

function relativeDocumentName(document) {
  const marker = "/documents/";
  const index = document.name.indexOf(marker);
  if (index < 0) throw new Error(`잘못된 문서 이름: ${document.name}`);
  return document.name.slice(index + marker.length);
}

async function collectTree(project, topCollections) {
  const result = [];
  async function visitCollection(collectionPath) {
    const documents = await listDocuments(project, collectionPath);
    for (const document of documents) {
      const relativePath = relativeDocumentName(document);
      result.push({ relativePath, fields: document.fields || {} });
      const children = await listCollectionIds(project, relativePath);
      for (const child of children) await visitCollection(`${relativePath}/${child}`);
    }
  }
  for (const collection of topCollections) await visitCollection(collection);
  return result.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function countsByTopCollection(documents) {
  const counts = Object.fromEntries(POOMSAE_COLLECTIONS.map((name) => [name, 0]));
  for (const document of documents) {
    const top = document.relativePath.split("/")[0];
    counts[top] = (counts[top] || 0) + 1;
  }
  return counts;
}

function digest(documents) {
  return crypto.createHash("sha256").update(canonicalJson(documents)).digest("hex");
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])])
  );
}

function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

async function copyDocuments(documents) {
  const batchSize = 200;
  for (let offset = 0; offset < documents.length; offset += batchSize) {
    const batch = documents.slice(offset, offset + batchSize);
    await api(`${databaseBase(TARGET_PROJECT)}/documents:commit`, {
      method: "POST",
      body: JSON.stringify({
        writes: batch.map((document) => ({
          update: {
            name: `${databaseResource(TARGET_PROJECT)}/documents/${document.relativePath}`,
            fields: document.fields
          }
        }))
      })
    });
    console.log(`복사 진행: ${Math.min(offset + batch.length, documents.length)}/${documents.length}`);
  }
}

async function main() {
  if (!["--inventory", "--dry-run", "--apply", "--sync", "--verify"].includes(mode)) {
    throw new Error("사용법: node scripts/migrate-poomsae-firestore.js [--inventory|--dry-run|--apply|--sync|--verify]");
  }

  const sourceCollections = await listCollectionIds(SOURCE_PROJECT);
  if (mode === "--inventory") {
    console.log(`원본 최상위 컬렉션: ${sourceCollections.join(", ") || "(없음)"}`);
    return;
  }

  const selected = POOMSAE_COLLECTIONS.filter((name) => sourceCollections.includes(name));
  const source = await collectTree(SOURCE_PROJECT, selected);
  const targetBefore = await collectTree(TARGET_PROJECT, POOMSAE_COLLECTIONS);
  console.log(`원본 품새 문서: ${source.length}개`, countsByTopCollection(source));
  console.log(`대상 기존 문서: ${targetBefore.length}개`, countsByTopCollection(targetBefore));
  console.log(`원본 검증값: ${digest(source)}`);

  if (mode === "--dry-run") return;
  if (mode === "--verify") {
    if (canonicalJson(source) !== canonicalJson(targetBefore)) {
      throw new Error("원본과 대상의 문서 내용이 일치하지 않습니다. --sync로 다시 동기화하세요.");
    }
    console.log("검증 완료: 모든 품새 문서와 하위 문서가 동일합니다. 원본은 그대로 보존되어 있습니다.");
    return;
  }
  if (mode === "--apply" && targetBefore.length > 0) {
    throw new Error("대상 DB가 비어 있지 않아 복사를 중단했습니다. 기존 데이터를 먼저 확인하세요.");
  }

  await copyDocuments(source);
  const targetAfter = await collectTree(TARGET_PROJECT, POOMSAE_COLLECTIONS);
  console.log(`대상 복사 후 문서: ${targetAfter.length}개`, countsByTopCollection(targetAfter));
  console.log(`대상 검증값: ${digest(targetAfter)}`);
  if (canonicalJson(source) !== canonicalJson(targetAfter)) {
    throw new Error("복사 후 문서 내용이 원본과 일치하지 않습니다.");
  }
  console.log("검증 완료: 모든 품새 문서와 하위 문서가 동일합니다. 원본은 삭제하지 않았습니다.");
}

main().catch((error) => {
  console.error(`마이그레이션 실패: ${error.message}`);
  process.exitCode = 1;
});
