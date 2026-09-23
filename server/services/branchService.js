const Branch = require("../models/Branch");
const Paper = require("../models/Paper");

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**
 * Dynamically resolves raw extracted branch text to a canonical branch code.
 * Step 1: Exact match against code or fullName
 * Step 2: Case-insensitive match against aliases array
 * Step 3: Fallback unmatched
 */
async function resolveBranch(rawText) {
  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    return { matched: false, rawText: "" };
  }

  const normalized = rawText.trim();
  const safeRegex = `^${escapeRegex(normalized)}$`;

  // Step 1: exact match against code or fullName (case-insensitive)
  let branch = await Branch.findOne({
    isActive: true,
    $or: [
      { code: normalized.toUpperCase() },
      { fullName: new RegExp(safeRegex, "i") },
    ],
  });

  if (branch) {
    return { matched: true, code: branch.code, fullName: branch.fullName };
  }

  // Step 2: alias match (case-insensitive)
  branch = await Branch.findOne({
    isActive: true,
    aliases: new RegExp(safeRegex, "i"),
  });

  if (branch) {
    return { matched: true, code: branch.code, fullName: branch.fullName };
  }

  // Step 3: no match found
  return { matched: false, rawText: normalized };
}

/**
 * Returns all active branches for dropdown menus.
 */
async function getAllActiveBranches() {
  const branches = await Branch.find({ isActive: true })
    .sort({ code: 1 })
    .select("code fullName aliases");

  return branches;
}

/**
 * Admin: Create a new branch document.
 */
async function addBranch({ code, fullName, aliases = [] }) {
  const upperCode = code.trim().toUpperCase();
  const normalizedAliases = Array.from(
    new Set([upperCode, fullName.trim(), ...aliases.map((a) => a.trim())].filter(Boolean))
  );

  const branch = await Branch.findOneAndUpdate(
    { code: upperCode },
    {
      code: upperCode,
      fullName: fullName.trim(),
      aliases: normalizedAliases,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  return branch;
}

/**
 * Admin: Add an alias to an existing branch.
 */
async function addAlias(branchCode, newAlias) {
  if (!newAlias || !newAlias.trim()) return null;
  const upperCode = branchCode.trim().toUpperCase();

  const branch = await Branch.findOneAndUpdate(
    { code: upperCode },
    { $addToSet: { aliases: newAlias.trim() } },
    { new: true }
  );

  return branch;
}

/**
 * Admin: Batch resolve all papers with a specific pendingBranchName.
 */
async function resolvePendingBranches({ pendingName, action, targetCode, newBranchData }) {
  let canonicalCode = targetCode ? targetCode.toUpperCase() : null;

  if (action === "create_new" && newBranchData) {
    const created = await addBranch({
      code: newBranchData.code,
      fullName: newBranchData.fullName,
      aliases: [...(newBranchData.aliases || []), pendingName],
    });
    canonicalCode = created.code;
  } else if (action === "map_existing" && canonicalCode) {
    await addAlias(canonicalCode, pendingName);
  }

  if (!canonicalCode) {
    throw new Error("Target branch code is required for resolution.");
  }

  // Batch update all papers matching this pendingBranchName
  const result = await Paper.updateMany(
    {
      branchPending: true,
      pendingBranchName: new RegExp(`^${escapeRegex(pendingName.trim())}$`, "i"),
    },
    {
      $set: {
        branch: canonicalCode,
        branchPending: false,
        pendingBranchName: null,
      },
    }
  );

  return {
    resolvedCount: result.modifiedCount,
    canonicalCode,
  };
}

module.exports = {
  escapeRegex,
  resolveBranch,
  getAllActiveBranches,
  addBranch,
  addAlias,
  resolvePendingBranches,
};
