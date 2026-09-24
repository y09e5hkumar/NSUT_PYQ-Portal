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
    } else {
      console.log("No 'subjects' collection found or already migrated.");
    }

    // 2. Drop old indexes on 'papers' if any
    try {
      const paperIndexes = await db.collection("papers").indexes();
      for (const idx of paperIndexes) {
        if (idx.name !== "_id_" && !idx.name.includes("courseTitle")) {
          if (idx.name.includes("subject") || idx.name.includes("title")) {
            console.log(`Dropping old index: ${idx.name}`);
            await db.collection("papers").dropIndex(idx.name);
          }
        }
      }
    } catch (err) {
      console.log("Index drop note:", err.message);
    }

    // 3. Migrate papers collection
    const papers = await db.collection("papers").find({}).toArray();
    console.log(`Found ${papers.length} papers to migrate.`);

    let updatedCount = 0;
    for (const paper of papers) {
      const updateFields = {};
      const unsetFields = {
        title: "",
        subject: "",
        subjectPending: "",
        pendingSubjectName: "",
      };

      // Set courseTitle from subject if courseTitle is missing
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

      const updateOp = { $unset: unsetFields };
      if (Object.keys(updateFields).length > 0) {
        updateOp.$set = updateFields;
      }

      await db.collection("papers").updateOne({ _id: paper._id }, updateOp);
      updatedCount++;
    }

    console.log(`Migrated ${updatedCount} paper documents.`);

    // 4. Ensure new indexes on Paper model
    await Paper.syncIndexes();
    await CourseTitle.syncIndexes();
    console.log("Indexes synchronized successfully!");

    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
