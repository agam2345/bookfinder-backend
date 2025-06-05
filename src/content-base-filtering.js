const fs = require("fs");
const path = require("path");


const tfidfModel = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../cbf/tfidf_model.json"), "utf8"));
const tfidfMatrix = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../cbf/tfidf_matrix.json"), "utf8"));
const titleToIndex = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../cbf/title_to_index.json"), "utf8"));
const bookData = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../cbf/book_data.json"), "utf8"));

function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function rekomendasikanBuku(judulBukuInput, topN = 5) {
  if (!(judulBukuInput in titleToIndex)) {
    return `Buku '${judulBukuInput}' tidak ditemukan dalam data.`;
  }

  const idx = titleToIndex[judulBukuInput];
  const simScores = tfidfMatrix.map((vec, i) => [i, cosineSimilarity(tfidfMatrix[idx], vec)]);

  simScores.sort((a, b) => b[1] - a[1]);

  const topSimScores = simScores.filter(x => x[0] !== idx).slice(0, topN);

  return topSimScores.map(([i, score]) => ({
    similarity: score.toFixed(3),
    ...bookData[i]
  }));
}

module.exports = rekomendasikanBuku;
