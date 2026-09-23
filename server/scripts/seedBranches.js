require("dotenv").config({ path: __dirname + "/../.env" });
const mongoose = require("mongoose");
const Branch = require("../models/Branch");

const SEED_BRANCHES = [
  {
    code: "CSAI",
    fullName: "Computer Science and Engineering (Artificial Intelligence)",
    aliases: [
      "Computer Science and Engineering (Artificial Intelligence)",
      "CSAI",
      "CS AI",
      "Computer Science AI",
      "Comp Sci AI",
      "Computer Science (AI)",
    ],
  },
  {
    code: "CSE",
    fullName: "Computer Science and Engineering",
    aliases: [
      "Computer Science and Engineering",
      "CSE",
      "CS",
      "Computer Science",
      "Comp Sci",
      "Computer Sci & Engg",
    ],
  },
  {
    code: "CSDS",
    fullName: "Computer Science and Engineering (Data Science)",
    aliases: [
      "Computer Science and Engineering (Data Science)",
      "CSDS",
      "CS DS",
      "Computer Science Data Science",
      "Data Science",
      "Computer Science (Data Science)",
    ],
  },
  {
    code: "IT",
    fullName: "Information Technology",
    aliases: [
      "Information Technology",
      "IT",
      "Info Tech",
      "Information Tech",
    ],
  },
  {
    code: "ITNS",
    fullName: "Information Technology (Network and Information Security)",
    aliases: [
      "Information Technology (Network and Information Security)",
      "ITNS",
      "IT NS",
      "Network Security",
      "Info Tech NS",
      "Network & Info Security",
    ],
  },
  {
    code: "MAC",
    fullName: "Mathematics and Computing",
    aliases: [
      "Mathematics and Computing",
      "MAC",
      "Maths and Computing",
      "Math & Comp",
      "Maths & Computing",
      "Math and Computing",
    ],
  },
  {
    code: "EIOT",
    fullName: "Electronics and Internet of Things",
    aliases: [
      "Electronics and Internet of Things",
      "EIOT",
      "E-IoT",
      "Electronics IoT",
      "IoT",
      "Electronics & IoT",
    ],
  },
  {
    code: "ECE",
    fullName: "Electronics and Communication Engineering",
    aliases: [
      "Electronics and Communication Engineering",
      "ECE",
      "Electronics & Communication",
      "Electronics and Communication",
      "Electronics Communication",
    ],
  },
  {
    code: "EE",
    fullName: "Electrical Engineering",
    aliases: [
      "Electrical Engineering",
      "EE",
      "Electrical Engg",
      "Electrical",
    ],
  },
  {
    code: "ICE",
    fullName: "Instrumentation and Control Engineering",
    aliases: [
      "Instrumentation and Control Engineering",
      "ICE",
      "Instrumentation & Control",
      "Instrumentation and Control",
      "Instr & Control",
    ],
  },
  {
    code: "ME",
    fullName: "Mechanical Engineering",
    aliases: [
      "Mechanical Engineering",
      "ME",
      "Mech",
      "Mechanical Engg",
      "Mechanical",
    ],
  },
  {
    code: "BT",
    fullName: "Biotechnology",
    aliases: [
      "Biotechnology",
      "BT",
      "Bio Tech",
      "Bio Technology",
      "Bio-Tech",
    ],
  },
  {
    code: "CSDA",
    fullName: "Computer Science and Design Automation",
    aliases: [
      "Computer Science and Design Automation",
      "CSDA",
      "CS Design Automation",
      "Design Automation",
    ],
  },
  {
    code: "CIOT",
    fullName: "Computer Science and Internet of Things",
    aliases: [
      "Computer Science and Internet of Things",
      "CIOT",
      "CS IoT",
      "CS Internet of Things",
    ],
  },
  {
    code: "ECAM",
    fullName: "Electronics and Communication Engineering (Artificial Intelligence and Machine Learning)",
    aliases: [
      "Electronics and Communication Engineering (Artificial Intelligence and Machine Learning)",
      "ECAM",
      "ECE AI",
      "ECE AIML",
      "Electronics (AI & ML)",
    ],
  },
  {
    code: "MEEV",
    fullName: "Mechanical Engineering (Electric Vehicles)",
    aliases: [
      "Mechanical Engineering (Electric Vehicles)",
      "MEEV",
      "Mech EV",
      "Mechanical EV",
      "Electric Vehicles",
    ],
  },
  {
    code: "CE",
    fullName: "Civil Engineering",
    aliases: [
      "Civil Engineering",
      "CE",
      "Civil Engg",
      "Civil",
    ],
  },
  {
    code: "GI",
    fullName: "Geoinformatics",
    aliases: [
      "Geoinformatics",
      "GI",
      "Geo Informatics",
      "Geo-Informatics",
      "Geo Informatics Engg",
    ],
  },
];

async function seed() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/pyqportal";
  console.log("Connecting to MongoDB for branch seeding...");
  await mongoose.connect(mongoUri);

  for (const item of SEED_BRANCHES) {
    await Branch.findOneAndUpdate(
      { code: item.code },
      {
        code: item.code,
        fullName: item.fullName,
        aliases: item.aliases,
        isActive: true,
      },
      { upsert: true, new: true }
    );
    console.log(`Seeded branch: ${item.code} (${item.fullName})`);
  }

  console.log("Branch seeding complete! All 18 branches upserted successfully.");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Branch seed script error:", err);
  process.exit(1);
});
