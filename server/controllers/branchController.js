const { getAllActiveBranches } = require("../services/branchService");

exports.getBranches = async (req, res) => {
  try {
    const branches = await getAllActiveBranches();
    res.json(branches);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch branches." });
  }
};
