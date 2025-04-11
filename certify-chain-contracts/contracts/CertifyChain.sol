// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CertifyChain {
    // Structs
    struct Institution {
        string name;
        string email;
        bool isRegistered;
        uint256 registrationDate;
    }
    
    struct Certificate {
        string studentName;
        string courseName;
        uint256 issueDate;
        address issuerAddress;
        string institutionName;
        bool isValid;
    }
    
    // Mappings
    mapping(address => Institution) public institutions;
    mapping(string => Certificate) public certificates;
    mapping(address => string[]) public institutionCertificates;
    
    // Events
    event InstitutionRegistered(address indexed institutionAddress, string name, uint256 timestamp);
    event CertificateIssued(string certificateId, string studentName, address indexed issuerAddress, uint256 timestamp);
    event CertificateRevoked(string certificateId, address indexed issuerAddress, uint256 timestamp);
    
    // Modifiers
    modifier onlyRegisteredInstitution() {
        require(institutions[msg.sender].isRegistered, "Institution not registered");
        _;
    }
    
    // Functions
    function registerInstitution(string memory _name, string memory _email) public {
        require(!institutions[msg.sender].isRegistered, "Institution already registered");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_email).length > 0, "Email cannot be empty");
        
        institutions[msg.sender] = Institution({
            name: _name,
            email: _email,
            isRegistered: true,
            registrationDate: block.timestamp
        });
        
        emit InstitutionRegistered(msg.sender, _name, block.timestamp);
    }
    
    function issueCertificate(
        string memory _certificateId,
        string memory _studentName,
        string memory _courseName
    ) public onlyRegisteredInstitution {
        require(bytes(_certificateId).length > 0, "Certificate ID cannot be empty");
        require(bytes(_studentName).length > 0, "Student name cannot be empty");
        require(bytes(_courseName).length > 0, "Course name cannot be empty");
        require(certificates[_certificateId].issueDate == 0, "Certificate ID already exists");
        
        certificates[_certificateId] = Certificate({
            studentName: _studentName,
            courseName: _courseName,
            issueDate: block.timestamp,
            issuerAddress: msg.sender,
            institutionName: institutions[msg.sender].name,
            isValid: true
        });
        
        institutionCertificates[msg.sender].push(_certificateId);
        
        emit CertificateIssued(_certificateId, _studentName, msg.sender, block.timestamp);
    }
    
    function revokeCertificate(string memory _certificateId) public onlyRegisteredInstitution {
        require(certificates[_certificateId].issueDate > 0, "Certificate does not exist");
        require(certificates[_certificateId].issuerAddress == msg.sender, "Not authorized to revoke this certificate");
        require(certificates[_certificateId].isValid, "Certificate already revoked");
        
        certificates[_certificateId].isValid = false;
        
        emit CertificateRevoked(_certificateId, msg.sender, block.timestamp);
    }
    
    function verifyCertificate(string memory _certificateId) public view returns (
        string memory studentName,
        string memory courseName,
        uint256 issueDate,
        address issuerAddress,
        string memory institutionName,
        bool isValid
    ) {
        Certificate memory cert = certificates[_certificateId];
        require(cert.issueDate > 0, "Certificate does not exist");
        
        return (
            cert.studentName,
            cert.courseName,
            cert.issueDate,
            cert.issuerAddress,
            cert.institutionName,
            cert.isValid
        );
    }
    
    function getInstitutionDetails(address _institutionAddress) public view returns (
        string memory name,
        string memory email,
        bool isRegistered,
        uint256 registrationDate
    ) {
        Institution memory inst = institutions[_institutionAddress];
        return (
            inst.name,
            inst.email,
            inst.isRegistered,
            inst.registrationDate
        );
    }
    
    function getInstitutionCertificatesCount(address _institutionAddress) public view returns (uint256) {
        return institutionCertificates[_institutionAddress].length;
    }
    
    function getInstitutionCertificateByIndex(address _institutionAddress, uint256 _index) public view returns (string memory) {
        require(_index < institutionCertificates[_institutionAddress].length, "Index out of bounds");
        return institutionCertificates[_institutionAddress][_index];
    }
}

