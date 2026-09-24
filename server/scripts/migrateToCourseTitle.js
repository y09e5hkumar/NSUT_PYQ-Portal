const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const CourseTitle = require("../models/CourseTitle");
const Paper = require("../models/Paper");

async function migrate() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("MONGO_URI not found in env");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB for migration...");

    const db = mongoose.connection.db;

    // 1. Copy docs from 'subjects' collection to 'coursetitles' collection if 'subjects' exists
    const collections = await db.listCollections({ name: "subjects" }).toArray();
    if (collections.length > 0) {
      const oldSubjects = await db.collection("subjects").find({}).toArray();
      console.log(`Found ${oldSubjects.length} documents in 'subjects' collection.`);

      for (const subj of oldSubjects) {
        await db.collection("coursetitles").updateOne(
          { _id: subj._id },
          {
            $set: {
              name: subj.name,
              branch: subj.branch,
              semester: subj.semester,
              isActive: subj.isActive !== undefined ? subj.isActive : true,
              createdAt: subj.createdAt || new Date(),
              updatedAt: subj.updatedAt || new Date(),
            },
          },
          { upsert: true }
        );
      }
      console.log("Successfully migrated 'subjects' documents to 'coursetitles'.");
    }

    // 2. Migrate 'paper' collection
    const papers = await db.collection("paper").find({}).toArray();
    console.log(`Found ${papers.length} papers in 'paper' collection to migrate.`);

    let updatedCount = 0;
    let duplicateCount = 0;

    for (const paper of papers) {
      const updateFields = {};
      const unsetFields = {
        title: "",
        subject: "",
        subjectPending: "",
        pendingSubjectName: "",
      };

      if (!paper.courseTitle && paper.subject) {
        updateFields.courseTitle = paper.subject;
      }
      if (paper.courseTitlePending === undefined) {
        updateFields.courseTitlePending = paper.subjectPending || false;
      }
      if (paper.pendingCourseTitleName === undefined && paper.pendingSubjectName) {
        updateFields.pendingCourseTitleName = paper.pendingSubjectName;
      }
      if (paper.courseCode === undefined || paper.courseCode === null) {
        updateFields.courseCode = "";
      }
      if (paper.courseCodePending === undefined) {
        updateFields.courseCodePending = false;
      }
      if (paper.branchPending === undefined) {
        updateFields.branchPending = false;
      }

      const updateOp = { $unset: unsetFields };
      if (Object.keys(updateFields).length > 0) {
        updateOp.$set = updateFields;
      }

      try {
        await db.collection("paper").updateOne({ _id: paper._id }, updateOp);
        updatedCount++;
      } catch (err) {
        if (err.code === 11000) {
          console.log(`Duplicate paper detected for _id ${paper._id}. Cleaning up duplicate record.`);
          await db.collection("paper").deleteOne({ _id: paper._id });
          duplicateCount++;
        } else {
          throw err;
        }
      }
    }

    console.log(`Migrated ${updatedCount} paper documents. (Removed ${duplicateCount} exact duplicate(s)).`);

    // 3. Ensure new indexes on Paper model and CourseTitle model
    try {
      await Paper.syncIndexes();
      await CourseTitle.syncIndexes();
      console.log("Indexes synchronized successfully!");
    } catch (idxErr) {
      console.log("Index sync note:", idxErr.message);
    }

    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
