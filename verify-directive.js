// Quick confirmation - directive file status

const fs = require("fs");
const path = require("path");
const directivePath = path.join(process.cwd(), "..", "PaveCon_SiteDiary_Directive.md");
const content = fs.readFileSync(directivePath, "utf8");

// Check for key sections
const has17_5 = content.includes("17.5 UI/UX Gaps");
const hasG11 = content.includes("G11 (form)");
const hasG12 = content.includes("G12 (motion)");
const hasG13 = content.includes("G13 (final)");
const hasG0 = content.includes("Gate G0");
const hasG0Verification = content.includes("npm run build");

console.log("Directive file status:");
console.log("  17.5 UI/UX Gaps section:", has17_5 ? "✅ YES" : "❌ NO");
console.log("  G11 (Form completeness):", hasG11 ? "✅ YES" : "❌ NO");
console.log("  G12 (Motion compliance):", hasG12 ? "✅ YES" : "❌ NO");
console.log("  G13 (Final regression):", hasG13 ? "✅ YES" : "❌ NO");
console.log("  G0 (Build verification):", hasG0 ? "✅ YES" : "❌ NO");
console.log("  G0 verification:", hasG0Verification ? "✅ YES" : "❌ NO");

const allChecks = [has17_5, hasG11, hasG12, hasG13, hasG0, hasG0Verification];
const allPassed = allChecks.every(Boolean);

console.log("\nAll checks passed:", allPassed ? "✅ YES" : "❌ NO");
console.log("\nTotal checks:", allChecks.length, "Passed:", allChecks.filter(Boolean).length);