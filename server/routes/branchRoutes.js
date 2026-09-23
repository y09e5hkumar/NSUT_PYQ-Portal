const router = require("express").Router();
const { getBranches } = require("../controllers/branchController");

// Public route to list active branches
router.get("/", getBranches);

module.exports = router;
