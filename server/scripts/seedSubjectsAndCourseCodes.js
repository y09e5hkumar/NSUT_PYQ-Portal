/**
 * server/scripts/seedSubjectsAndCourseCodes.js
 *
 * Extracts distinct subject + courseCode values already in the Paper collection
 * and seeds them into the Subject and CourseCode collections.
 *
 * Run AFTER backfillPendingFlags.js and AFTER the Branch collection is seeded.
 *
 * Usage:
 *   cd server
 *   node scripts/seedSubjectsAndCourseCodes.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const Paper = require("../models/Paper");
  const Subject = require("../models/Subject");
  const CourseCode = require("../models/CourseCode");

  // Extract distinct (subject, branch) pairs from existing papers
  const distinctPairs = await Paper.aggregate([
    {
      $match: {
        subject: { $exists: true, $ne: null, $ne: "" },
        branch: { $exists: true, $ne: null, $ne: "" },
        branchPending: { $ne: true },
        subjectPending: { $ne: true },
      },
    },
    {
      $group: {
        _id: { subject: "$subject", branch: "$branch" },
        semester: { $first: "$semester" },
        courseCodes: {
          $addToSet: {
            $cond: [
              { $and: [{ $ne: ["$courseCode", null] }, { $ne: ["$courseCode", ""] }] },
              "$courseCode",
              "$$REMOVE",
            ],
          },
        },
      },
    },
    { $sort: { "_id.branch": 1, "_id.subject": 1 } },
  ]);

  console.log(`Found ${distinctPairs.length} distinct (subject, branch) pair(s) to seed.`);

  let subjectCount = 0;
  let courseCodeCount = 0;

  for (const pair of distinctPairs) {
    const { subject, branch } = pair._id;

    // Upsert the subject
    const subjectDoc = await Subject.findOneAndUpdate(
      { name: subject, branch },
      { name: subject, branch, semester: pair.semester, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    subjectCount++;

    // Seed course codes for this subject
    for (const code of pair.courseCodes) {
      if (!code || !code.trim()) continue;
      try {
        await CourseCode.findOneAndUpdate(
          { code: code.trim().toUpperCase() },
          { code: code.trim().toUpperCase(), subject: subjectDoc._id, isActive: true },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        courseCodeCount++;
      } catch (err) {
        // Duplicate code key across different subjects — log and skip
        console.warn(`  ⚠️  Skipping duplicate course code "${code}":`, err.message);
      }
    }
  }

  console.log(`✅ Seeded ${subjectCount} subject(s) and ${courseCodeCount} course code(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
