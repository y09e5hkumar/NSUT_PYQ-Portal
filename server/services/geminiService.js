const { GoogleGenAI, Type } = require("@google/genai");

async function extractMetadataWithGemini(pdfBuffer) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "GEMINI_API_KEY environment variable is not configured.",
    };
  }

  const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const ai = new GoogleGenAI({ apiKey });

  try {
    const base64Pdf = pdfBuffer.toString("base64");

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64Pdf,
          },
        },
        `Extract metadata from this previous year question paper PDF for NSUT students. Return JSON with the exact specified structure.`,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            degree: { type: Type.STRING, description: "Degree program, e.g. B.Tech" },
            semester: { type: Type.NUMBER, description: "Semester number 1 through 8" },
            branch: {
              type: Type.STRING,
              description: "Engineering branch code e.g. CSAI, CSE, CSDS, IT, ITNS, MAC, EIOT, ECE, EE, ICE, ME, BT, CSDA, CIOT, ECAM, MEEV, CE, GI",
            },
            courseTitle: { type: Type.STRING, description: "Official title of the subject/course" },
            courseCode: { type: Type.STRING, description: "Subject course code e.g. CS301" },
            examType: {
              type: Type.STRING,
              description: "Exam type, must be 'Mid Sem', 'End Sem', or 'Summer Sem'",
            },
            year: { type: Type.NUMBER, description: "4-digit examination year e.g. 2024" },
            extractedText: { type: Type.STRING, description: "Full text content extracted from the document" },
          },
          required: [
            "degree",
            "semester",
            "branch",
            "courseTitle",
            "courseCode",
            "examType",
            "year",
            "extractedText",
          ],
        },
      },
    });

    const textResult = response.text();
    const data = JSON.parse(textResult);

    return {
      success: true,
      data: {
        extractedText: data.extractedText || "",
        metadata: {
          degree: data.degree || "B.Tech",
          semester: Number(data.semester) || "",
          branch: data.branch || "",
          subject: data.courseTitle || data.courseCode || "",
          courseTitle: data.courseTitle || "",
          courseCode: data.courseCode || "",
          examType: data.examType || "End Sem",
          year: Number(data.year) || new Date().getFullYear(),
        },
        confidence: {
          degree: 0.95,
          semester: 0.95,
          branch: 0.95,
          subject: 0.95,
          courseTitle: 0.95,
          courseCode: 0.95,
          examType: 0.95,
          year: 0.95,
        },
      },
    };
  } catch (err) {
    console.error("Gemini extraction error:", err.message);
    return {
      success: false,
      error: err.message || "Failed to extract metadata using Gemini Vision.",
    };
  }
}

module.exports = {
  extractMetadataWithGemini,
};
