/**
 * Script to check and fix contracts/.env configuration
 */

const fs = require("fs");
const path = require("path");

const contractsEnvPath = path.join(__dirname, "../contracts/.env");
const rootEnvPath = path.join(__dirname, "../.env.local");

console.log("🔍 Checking contracts/.env configuration...\n");

// Read contracts/.env
let contractsEnv = {};
if (fs.existsSync(contractsEnvPath)) {
  const content = fs.readFileSync(contractsEnvPath, "utf-8");
  content.split("\n").forEach((line) => {
    const match = line.match(/^([^=#]+)=(.*)$/);
    if (match) {
      contractsEnv[match[1].trim()] = match[2].trim();
    }
  });
}

// Read root .env.local for API key reference
let rootEnv = {};
if (fs.existsSync(rootEnvPath)) {
  const content = fs.readFileSync(rootEnvPath, "utf-8");
  content.split("\n").forEach((line) => {
    const match = line.match(/^([^=#]+)=(.*)$/);
    if (match) {
      rootEnv[match[1].trim()] = match[2].trim();
    }
  });
}

console.log("Current contracts/.env:");
console.log("  ALCHEMY_API_KEY:", contractsEnv.ALCHEMY_API_KEY ? "✅ Set" : "❌ Missing");
console.log("  ALCHEMY_POLICY_ID:", contractsEnv.ALCHEMY_POLICY_ID ? "✅ Set" : "⚠️  Optional");
console.log("  DEPLOYER_PRIVATE_KEY:", contractsEnv.DEPLOYER_PRIVATE_KEY ? "✅ Set" : "❌ Missing");
console.log("");

// Check for issues
const issues = [];

if (!contractsEnv.ALCHEMY_API_KEY) {
  // Try to extract from ALCHEMY_API_URL if it exists
  if (contractsEnv.ALCHEMY_API_URL) {
    const urlMatch = contractsEnv.ALCHEMY_API_URL.match(/v2\/([^?\/]+)/);
    if (urlMatch) {
      issues.push({
        type: "fix",
        message: `Found API key in ALCHEMY_API_URL, extracting...`,
        fix: () => {
          contractsEnv.ALCHEMY_API_KEY = urlMatch[1];
          delete contractsEnv.ALCHEMY_API_URL;
        },
      });
    }
  }
  
  // Try to get from root .env.local
  if (rootEnv.NEXT_PUBLIC_ALCHEMY_API_KEY) {
    issues.push({
      type: "suggest",
      message: `Found API key in .env.local, copy to contracts/.env`,
      value: rootEnv.NEXT_PUBLIC_ALCHEMY_API_KEY,
    });
  }
  
  if (!contractsEnv.ALCHEMY_API_KEY && !rootEnv.NEXT_PUBLIC_ALCHEMY_API_KEY) {
    issues.push({
      type: "error",
      message: "ALCHEMY_API_KEY not found. You need to set it in contracts/.env",
    });
  }
}

if (!contractsEnv.DEPLOYER_PRIVATE_KEY) {
  issues.push({
    type: "error",
    message: "DEPLOYER_PRIVATE_KEY not found in contracts/.env",
  });
}

// Display issues and fixes
if (issues.length === 0) {
  console.log("✅ Configuration looks good!\n");
  process.exit(0);
}

console.log("Issues found:\n");

issues.forEach((issue, i) => {
  console.log(`${i + 1}. ${issue.type.toUpperCase()}: ${issue.message}`);
  if (issue.fix) {
    issue.fix();
  }
  if (issue.value) {
    console.log(`   Value: ${issue.value}`);
  }
  console.log("");
});

// Generate fixed .env content
if (issues.some((i) => i.type === "fix")) {
  let newEnvContent = "";
  
  // Add ALCHEMY_API_KEY
  if (contractsEnv.ALCHEMY_API_KEY) {
    newEnvContent += `ALCHEMY_API_KEY=${contractsEnv.ALCHEMY_API_KEY}\n`;
  } else if (rootEnv.NEXT_PUBLIC_ALCHEMY_API_KEY) {
    newEnvContent += `ALCHEMY_API_KEY=${rootEnv.NEXT_PUBLIC_ALCHEMY_API_KEY}\n`;
  }
  
  // Add ALCHEMY_POLICY_ID if exists
  if (contractsEnv.ALCHEMY_POLICY_ID) {
    newEnvContent += `ALCHEMY_POLICY_ID=${contractsEnv.ALCHEMY_POLICY_ID}\n`;
  } else if (rootEnv.NEXT_PUBLIC_ALCHEMY_POLICY_ID) {
    newEnvContent += `ALCHEMY_POLICY_ID=${rootEnv.NEXT_PUBLIC_ALCHEMY_POLICY_ID}\n`;
  }
  
  // Add DEPLOYER_PRIVATE_KEY
  if (contractsEnv.DEPLOYER_PRIVATE_KEY) {
    newEnvContent += `DEPLOYER_PRIVATE_KEY=${contractsEnv.DEPLOYER_PRIVATE_KEY}\n`;
  }
  
  // Add other existing variables (preserve them)
  Object.keys(contractsEnv).forEach((key) => {
    if (!["ALCHEMY_API_KEY", "ALCHEMY_POLICY_ID", "DEPLOYER_PRIVATE_KEY", "ALCHEMY_API_URL"].includes(key)) {
      newEnvContent += `${key}=${contractsEnv[key]}\n`;
    }
  });
  
  console.log("📝 Suggested contracts/.env content:\n");
  console.log(newEnvContent);
  console.log("\n💡 Copy this to contracts/.env");
}

