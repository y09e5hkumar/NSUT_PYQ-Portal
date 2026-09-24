/**
 * server/scripts/backfillPendingFlags.js
 *
 * Run ONCE before enforcing the new compound unique index.
 * Sets branchPending: false, subjectPending: false, courseCodePending: false
 * on all existing papers that don't have these fields yet.
 *
 * Usage:
 *   cd server
 *   node scripts/backfillPendingFlags.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const Paper = require("../models/Paper");

  // Set all three pending flags to false on every paper that lacks them
  const result = await Paper.updateMany(
    {
      $or: [
        { branchPending: { $exists: false } },
        { subjectPending: { $exists: false } },
        { courseCodePending: { $exists: false } },
      ],
    },
    {
      $set: {
        branchPending: false,
        subjectPending: false,
        courseCodePending: false,
      },
    }
  );

  console.log(`✅ Backfilled ${result.modifiedCount} paper(s) with pending flags.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});
