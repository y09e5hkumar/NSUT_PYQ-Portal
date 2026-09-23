const pdfModule = require("pdf-parse");
const { createWorker } = require("tesseract.js");
const { resolveBranch, getAllActiveBranches } = require("./branchService");

const ROMAN_MAP = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
};

/**
 * Safely parses PDF buffer using pdf-parse library
 */
async function parsePdfText(pdfBuffer) {
  if (!pdfBuffer) return "";

  try {
    if (typeof pdfModule === "function") {
      const res = await pdfModule(pdfBuffer);
      return res?.text ? res.text.trim() : "";
    } else if (pdfModule && pdfModule.PDFParse) {
      const parser = new pdfModule.PDFParse({ data: pdfBuffer });
      const res = await parser.getText();
      await parser.destroy();
      return res?.text ? res.text.trim() : "";
    }
  } catch (err) {
    console.error("pdf-parse extraction failed:", err.message);
  }
  return "";
}

/**
 * Run entity extraction over text via regex rules & branch taxonomy resolution
 */
async function extractEntitiesFromText(rawText) {
  const text = rawText || "";
  const confidence = {};
  const metadata = {
    branch: "",
    rawBranchText: "",
    semester: "",
    subject: "",
    courseCode: "",
    courseTitle: "",
    year: "",
    examType: "",
    degree: "B.Tech",
  };

  // 1. Dynamic Branch Extraction
  const activeBranches = await getAllActiveBranches();
  let foundBranchMatch = false;

  // First pass: try matching active branch codes or fullNames directly in text
  for (const b of activeBranches) {
    const codeRegex = new RegExp(`\\b${b.code}\\b`, "i");
    const nameRegex = new RegExp(`\\b${b.fullName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}\\b`, "i");

    if (codeRegex.test(text) || nameRegex.test(text)) {
      metadata.branch = b.code;
      confidence.branch = 0.95;
      foundBranchMatch = true;
      break;
    }

    // Check aliases
    for (const alias of b.aliases || []) {
      if (alias.length >= 2) {
        const aliasRegex = new RegExp(`\\b${alias.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}\\b`, "i");
        if (aliasRegex.test(text)) {
          metadata.branch = b.code;
          confidence.branch = 0.9;
          foundBranchMatch = true;
          break;
        }
      }
    }
    if (foundBranchMatch) break;
  }

  // Second pass: if no active branch matched, check for "Branch: XYZ" pattern
  if (!foundBranchMatch) {
    const branchLineMatch = text.match(/(?:branch|dept|department|discipline)\s*[:\-]\s*([^\n\r,]+)/i);
    if (branchLineMatch) {
      const rawBranchCandidate = branchLineMatch[1].trim();
      metadata.rawBranchText = rawBranchCandidate;

      const resolution = await resolveBranch(rawBranchCandidate);
      if (resolution.matched) {
        metadata.branch = resolution.code;
        confidence.branch = 0.9;
      } else {
        confidence.branch = 0.2;
      }
    } else {
      confidence.branch = 0.1;
    }
  }

  // 2. Semester Extraction
  const semMatch = text.match(/(?:sem(?:ester)?|sem)\s*[:\-]?\s*([1-8]|i{1,3}|iv|v|vi{1,2}|viii)\b/i) ||
                   text.match(/\b([1-8])(?:st|nd|rd|th)?\s*(?:sem(?:ester)?)\b/i);
  if (semMatch) {
    const matchedVal = semMatch[1].toLowerCase();
    const semNum = ROMAN_MAP[matchedVal] || parseInt(matchedVal, 10);
    if (semNum >= 1 && semNum <= 8) {
      metadata.semester = semNum;
      confidence.semester = 0.9;
    }
  }
  if (!metadata.semester) {
    confidence.semester = 0.1;
  }

  // 3. Exam Type Extraction
  if (/mid\s*sem(?:ester)?/i.test(text)) {
    metadata.examType = "Mid Sem";
    confidence.examType = 0.95;
  } else if (/end\s*sem(?:ester)?/i.test(text)) {
    metadata.examType = "End Sem";
    confidence.examType = 0.95;
  } else if (/summer\s*sem(?:ester)?/i.test(text)) {
    metadata.examType = "Summer Sem";
    confidence.examType = 0.95;
  } else {
    confidence.examType = 0.1;
  }

  // 4. Year Extraction
  const yearMatch = text.match(/\b(201[5-9]|202[0-6])\b/);
  if (yearMatch) {
    metadata.year = parseInt(yearMatch[1], 10);
    confidence.year = 0.9;
  } else {
    confidence.year = 0.1;
  }

  // 5. Course Code & Course Title / Subject Extraction
  const codeMatch = text.match(/\b([A-Z]{2,4}\s*[\-\/]?\s*\d{3,4})\b/i);
  if (codeMatch) {
    metadata.courseCode = codeMatch[1].toUpperCase().replace(/\s+/g, "");
    confidence.courseCode = 0.85;
  } else {
    confidence.courseCode = 0.1;
  }

  // Subject / Title pattern matching
  const subjectMatch = text.match(/(?:paper|subject|course|title)\s*[:\-]\s*([^\n\r]+)/i);
  if (subjectMatch) {
    const rawSubj = subjectMatch[1].trim();
    metadata.subject = rawSubj;
    metadata.courseTitle = rawSubj;
    confidence.subject = 0.8;
    confidence.courseTitle = 0.8;
  } else if (metadata.courseCode) {
    metadata.subject = metadata.courseCode;
    confidence.subject = 0.4;
  } else {
    confidence.subject = 0.1;
    confidence.courseTitle = 0.1;
  }

  // Degree
  if (/m\.?\s*tech/i.test(text)) {
    metadata.degree = "M.Tech";
    confidence.degree = 0.9;
  } else {
    metadata.degree = "B.Tech";
    confidence.degree = 0.8;
  }

  return { metadata, confidence };
}

/**
 * Main OCR Extraction function
 */
async function extractTextAndMetadata(pdfBuffer) {
  let extractedText = await parsePdfText(pdfBuffer);

  // Fallback to tesseract.js if pdf-parse text is empty/too short and file is image format
  if (!extractedText || extractedText.length < 50) {
    if (pdfBuffer && (pdfBuffer.slice(0, 4).toString("hex") === "89504e47" || pdfBuffer.slice(0, 2).toString("hex") === "ffd8")) {
      try {
        const worker = await createWorker("eng");
        const ret = await worker.recognize(pdfBuffer);
        extractedText = ret.data?.text ? ret.data.text.trim() : "";
        await worker.terminate();
      } catch (ocrErr) {
        console.error("Tesseract OCR fallback failed:", ocrErr.message);
      }
    }
  }

  const { metadata, confidence } = await extractEntitiesFromText(extractedText);

  return {
    extractedText,
    metadata,
    confidence,
  };
}

module.exports = {
  extractTextAndMetadata,
  extractEntitiesFromText,
};
