const fs = require("fs");
const raw = fs.readFileSync("src/questionBank.js", "utf8");
const match = raw.match(/export const Q_UNIFIED = (\[[\s\S]*?\n\])/);
if (!match) throw new Error("Q_UNIFIED array not found");
const arr = JSON.parse(match[1]);
arr.slice(20, 40).forEach((q) => {
  console.log(`${q.id}|${q.areaEN}|${q.textEN}`);
});
