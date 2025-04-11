import { ethers } from "ethers"
import CertifyChainABI from "@/contracts/CertifyChain.json"
import contractAddress from "@/contracts/contract-address.json"

// Contract address from deployment
const certifyChainAddress = contractAddress.CertifyChain

// Get provider and signer
export const getProviderAndSigner = async () => {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask to use this application.")
  }

  await window.ethereum.request({ method: "eth_requestAccounts" })
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const signer = provider.getSigner()
  return { provider, signer }
}

// Get contract instance
export const getCertifyChainContract = async (withSigner = false) => {
  const { provider, signer } = await getProviderAndSigner()

  return new ethers.Contract(certifyChainAddress, CertifyChainABI.abi, withSigner ? signer : provider)
}

// Register institution
export const registerInstitution = async (name: string, email: string) => {
  const contract = await getCertifyChainContract(true)
  const tx = await contract.registerInstitution(name, email)
  return await tx.wait()
}

// Issue certificate
export const issueCertificate = async (certificateId: string, studentName: string, courseName: string) => {
  const contract = await getCertifyChainContract(true)
  const tx = await contract.issueCertificate(certificateId, studentName, courseName)
  return await tx.wait()
}

// Verify certificate
export const verifyCertificate = async (certificateId: string) => {
  const contract = await getCertifyChainContract()
  const result = await contract.verifyCertificate(certificateId)

  return {
    studentName: result.studentName,
    courseName: result.courseName,
    issueDate: new Date(result.issueDate.toNumber() * 1000),
    issuerAddress: result.issuerAddress,
    institutionName: result.institutionName,
    isValid: result.isValid,
  }
}

// Check if address is registered institution
export const isRegisteredInstitution = async (address: string) => {
  const contract = await getCertifyChainContract()
  const result = await contract.getInstitutionDetails(address)
  return result.isRegistered
}

// Get wallet address
export const getWalletAddress = async () => {
  const { signer } = await getProviderAndSigner()
  return await signer.getAddress()
}

// Server-side contract functions
export const getServerContract = async () => {
  // Use RPC URL from environment variables
  const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL)

  // Create contract instance
  return new ethers.Contract(certifyChainAddress, CertifyChainABI.abi, provider)
}

// Server-side verify certificate
export const verifyServerCertificate = async (certificateId: string) => {
  const contract = await getServerContract()
  const result = await contract.verifyCertificate(certificateId)

  return {
    studentName: result.studentName,
    courseName: result.courseName,
    issueDate: new Date(result.issueDate.toNumber() * 1000),
    issuerAddress: result.issuerAddress,
    institutionName: result.institutionName,
    isValid: result.isValid,
  }
}

// Server-side issue certificate with private key
export const issueCertificateWithPrivateKey = async (
  certificateId: string,
  studentName: string,
  courseName: string,
) => {
  // Use RPC URL and private key from environment variables
  const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL)
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider)

  // Create contract instance with wallet signer
  const contract = new ethers.Contract(certifyChainAddress, CertifyChainABI.abi, wallet)

  // Issue certificate
  const tx = await contract.issueCertificate(certificateId, studentName, courseName)
  return await tx.wait()
}

// Server-side revoke certificate with private key
export const revokeCertificateWithPrivateKey = async (certificateId: string) => {
  // Use RPC URL and private key from environment variables
  const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL)
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider)

  // Create contract instance with wallet signer
  const contract = new ethers.Contract(certifyChainAddress, CertifyChainABI.abi, wallet)

  // Revoke certificate
  const tx = await contract.revokeCertificate(certificateId)
  return await tx.wait()
}

