const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const CertifyChain = await hre.ethers.getContractFactory("CertifyChain");
  const certifyChain = await CertifyChain.deploy();

  await certifyChain.waitForDeployment(); // ✅ Fix: Use this for Ethers v6

  const contractAddress = await certifyChain.getAddress(); // ✅ Fix: Get contract address properly

  console.log("CertifyChain deployed to:", contractAddress);

  // For frontend integration
  saveFrontendFiles(contractAddress);
}

function saveFrontendFiles(contractAddress) {
  // Path to frontend contract data
  const contractsDir = path.join(__dirname, "..", "..", "certify-chain", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  // Save contract address
  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ CertifyChain: contractAddress }, undefined, 2)
  );

  // Save contract ABI
  const CertifyChainArtifact = require("../artifacts/contracts/CertifyChain.sol/CertifyChain.json");
  fs.writeFileSync(path.join(contractsDir, "CertifyChain.json"), JSON.stringify(CertifyChainArtifact, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
