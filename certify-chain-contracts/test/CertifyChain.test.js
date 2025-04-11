const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertifyChain", () => {
  let CertifyChain;
  let certifyChain;
  let owner, institution1, institution2, addr1;

  beforeEach(async () => {
    [owner, institution1, institution2, addr1] = await ethers.getSigners();

    CertifyChain = await ethers.getContractFactory("CertifyChain");
    certifyChain = await CertifyChain.deploy();
    await certifyChain.waitForDeployment(); // Updated for Ethers v6
  });

  describe("Institution Registration", () => {
    it("Should register a new institution", async () => {
      await certifyChain.connect(institution1).registerInstitution("Test Institution", "test@institution.edu");

      const institutionDetails = await certifyChain.getInstitutionDetails(institution1.address);

      expect(institutionDetails[0]).to.equal("Test Institution"); // Use index-based access
      expect(institutionDetails[1]).to.equal("test@institution.edu");
      expect(institutionDetails[2]).to.equal(true);
    });

    it("Should not allow registering the same institution twice", async () => {
      await certifyChain.connect(institution1).registerInstitution("Test Institution", "test@institution.edu");

      await expect(
        certifyChain.connect(institution1).registerInstitution("Test Institution Again", "test@institution.edu")
      ).to.be.revertedWith("Institution already registered");
    });
  });

  describe("Certificate Issuance", () => {
    beforeEach(async () => {
      await certifyChain.connect(institution1).registerInstitution("Test Institution", "test@institution.edu");
    });

    it("Should issue a new certificate", async () => {
      await certifyChain.connect(institution1).issueCertificate("CERT-123456", "John Doe", "Computer Science");

      const certificate = await certifyChain.verifyCertificate("CERT-123456");

      expect(certificate[0]).to.equal("John Doe"); // Use index-based access
      expect(certificate[1]).to.equal("Computer Science");
      expect(certificate[3]).to.equal(institution1.address);
      expect(certificate[4]).to.equal("Test Institution");
      expect(certificate[5]).to.equal(true);
    });

    it("Should not allow non-registered institutions to issue certificates", async () => {
      await expect(
        certifyChain.connect(addr1).issueCertificate("CERT-123456", "John Doe", "Computer Science")
      ).to.be.revertedWith("Institution not registered");
    });

    it("Should not allow duplicate certificate IDs", async () => {
      await certifyChain.connect(institution1).issueCertificate("CERT-123456", "John Doe", "Computer Science");

      await expect(
        certifyChain.connect(institution1).issueCertificate("CERT-123456", "Jane Smith", "Data Science")
      ).to.be.revertedWith("Certificate ID already exists");
    });
  });

  describe("Certificate Verification", () => {
    beforeEach(async () => {
      await certifyChain.connect(institution1).registerInstitution("Test Institution", "test@institution.edu");
      await certifyChain.connect(institution1).issueCertificate("CERT-123456", "John Doe", "Computer Science");
    });

    it("Should verify a valid certificate", async () => {
      const certificate = await certifyChain.verifyCertificate("CERT-123456");

      expect(certificate[0]).to.equal("John Doe");
      expect(certificate[5]).to.equal(true);
    });

    it("Should fail for non-existent certificates", async () => {
      await expect(certifyChain.verifyCertificate("NON-EXISTENT")).to.be.revertedWith("Certificate does not exist");
    });
  });

  describe("Certificate Revocation", () => {
    beforeEach(async () => {
      await certifyChain.connect(institution1).registerInstitution("Test Institution", "test@institution.edu");
      await certifyChain.connect(institution1).issueCertificate("CERT-123456", "John Doe", "Computer Science");
    });

    it("Should revoke a certificate", async () => {
      await certifyChain.connect(institution1).revokeCertificate("CERT-123456");

      const certificate = await certifyChain.verifyCertificate("CERT-123456");
      expect(certificate[5]).to.equal(false);
    });

    it("Should not allow non-issuers to revoke certificates", async () => {
      await certifyChain.connect(institution2).registerInstitution("Another Institution", "another@institution.edu");

      await expect(certifyChain.connect(institution2).revokeCertificate("CERT-123456")).to.be.revertedWith(
        "Not authorized to revoke this certificate"
      );
    });
  });

  describe("Institution Certificates", () => {
    beforeEach(async () => {
      await certifyChain.connect(institution1).registerInstitution("Test Institution", "test@institution.edu");
      await certifyChain.connect(institution1).issueCertificate("CERT-1", "John Doe", "Computer Science");
      await certifyChain.connect(institution1).issueCertificate("CERT-2", "Jane Smith", "Data Science");
    });

    it("Should track certificates issued by an institution", async () => {
      const count = await certifyChain.getInstitutionCertificatesCount(institution1.address);
      expect(count).to.equal(2);

      const cert1 = await certifyChain.getInstitutionCertificateByIndex(institution1.address, 0);
      const cert2 = await certifyChain.getInstitutionCertificateByIndex(institution1.address, 1);

      expect(cert1).to.equal("CERT-1");
      expect(cert2).to.equal("CERT-2");
    });
  });
});
