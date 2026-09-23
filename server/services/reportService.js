const Report = require("../models/Report");
const Paper = require("../models/Paper");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function createReport({ paperId, userId, reason, comment }) {
  const paper = await Paper.findById(paperId);
  if (!paper) {
    throw new Error("Paper not found");
  }

  try {
    const report = await Report.create({
      paper: paperId,
      reportedBy: userId,
      reason,
      comment,
    });

    // Mark paper as flagged (stays live and downloadable)
    paper.status = "flagged";
    await paper.save();

    return report;
  } catch (err) {
    if (err.code === 11000) {
      const existingError = new Error("You have already reported this paper.");
      existingError.status = 400;
      throw existingError;
    }
    throw err;
  }
}

async function resolveReport({ reportId, adminId, resolution, updatedMetadata }) {
  const report = await Report.findById(reportId).populate({
    path: "paper",
    populate: { path: "uploadedBy", select: "name email" },
  });

  if (!report) {
    throw new Error("Report not found");
  }

  report.status = "resolved";
  report.resolution = resolution;
  report.resolvedBy = adminId;
  report.resolvedAt = new Date();
  await report.save();

  const paper = report.paper;
  if (!paper) return report;

  if (resolution === "dismissed") {
    paper.status = "approved";
    await paper.save();
  } else if (resolution === "metadata_corrected") {
    if (updatedMetadata) {
      Object.assign(paper, updatedMetadata);
    }
    paper.status = "approved";
    await paper.save();
  } else if (resolution === "paper_removed") {
    paper.status = "removed";
    await paper.save();
  }

  // Send notification email to original uploader if available
  if (paper.uploadedBy && paper.uploadedBy.email) {
    try {
      await transporter.sendMail({
        from: `"NSUT PYQ Portal" <${process.env.EMAIL_USER}>`,
        to: paper.uploadedBy.email,
        subject: `Update on your paper "${paper.title}"`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Paper Status Update 📄</h2>
            <p>Hi ${paper.uploadedBy.name},</p>
            <p>An admin has reviewed a community report regarding your submission <strong>${paper.title}</strong>.</p>
            <p><strong>Action Taken:</strong> ${resolution.replace(/_/g, " ")}</p>
            <p>Thank you for your contribution to NSUT PYQ Portal.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send resolution email:", emailErr.message);
    }
  }

  return report;
}

module.exports = {
  createReport,
  resolveReport,
};
