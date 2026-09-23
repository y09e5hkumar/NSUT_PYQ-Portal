const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const TEMP_DIR = path.join(__dirname, "../uploads/temp");

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function saveTempFile(buffer) {
  const fileRef = uuidv4();
  const filePath = path.join(TEMP_DIR, `${fileRef}.pdf`);
  fs.writeFileSync(filePath, buffer);
  return fileRef;
}

function getTempFile(fileRef) {
  if (!fileRef || typeof fileRef !== "string") return null;
  const safeRef = path.basename(fileRef);
  const filePath = path.join(TEMP_DIR, `${safeRef}.pdf`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

function deleteTempFile(fileRef) {
  if (!fileRef || typeof fileRef !== "string") return;
  const safeRef = path.basename(fileRef);
  const filePath = path.join(TEMP_DIR, `${safeRef}.pdf`);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error("Failed to delete temp file:", e.message);
    }
  }
}

// Cleanup temp files older than 1 hour periodically
setInterval(() => {
  try {
    const files = fs.readdirSync(TEMP_DIR);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtimeMs > 60 * 60 * 1000) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (err) {
    // Ignore cleanup errors
  }
}, 30 * 60 * 1000);

module.exports = {
  saveTempFile,
  getTempFile,
  deleteTempFile,
};
