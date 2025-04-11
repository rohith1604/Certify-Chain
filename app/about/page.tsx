import { Award, BookOpen, Building, Code, FileCheck, Shield } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AboutPage() {
  return (
    <div className="container py-16 md:py-24">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">About Certify Chain</h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          A blockchain-based certificate verification system developed by students of Sri Siddhartha Institute of
          Technology
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div>
          <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-muted-foreground mb-6">
            Certify Chain aims to revolutionize the way educational certificates are issued, managed, and verified. By
            leveraging blockchain technology, we provide a secure, transparent, and tamper-proof system that eliminates
            certificate fraud and simplifies the verification process.
          </p>
          <p className="text-muted-foreground">
            Our platform enables educational institutions to issue digital certificates directly on the blockchain,
            providing students with verifiable credentials that can be easily shared with employers and other
            institutions worldwide.
          </p>
        </div>
        <div className="relative h-[300px] rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 z-10 rounded-lg"></div>
          <img
            src="/placeholder.svg?height=300&width=600"
            alt="Certify Chain Mission"
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
      </div>

      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-6 text-center">Key Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <Shield className="h-6 w-6 text-primary mb-2" />
              <CardTitle className="text-xl">Tamper-Proof</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Certificates stored on the blockchain cannot be altered or falsified, ensuring their authenticity and
                integrity.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <FileCheck className="h-6 w-6 text-primary mb-2" />
              <CardTitle className="text-xl">Instant Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Employers and institutions can instantly verify certificates using a unique certificate ID, eliminating
                lengthy verification processes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Building className="h-6 w-6 text-primary mb-2" />
              <CardTitle className="text-xl">Institutional Control</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Educational institutions maintain full control over the certificate issuance process, ensuring only
                legitimate certificates are issued.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Award className="h-6 w-6 text-primary mb-2" />
              <CardTitle className="text-xl">Credential Ownership</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Students own their credentials and can share them with anyone, anywhere, without relying on the issuing
                institution.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <BookOpen className="h-6 w-6 text-primary mb-2" />
              <CardTitle className="text-xl">Comprehensive Records</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                The system maintains a complete record of all certificates issued, providing a transparent and auditable
                history.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <Code className="h-6 w-6 text-primary mb-2" />
              <CardTitle className="text-xl">Open Standards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Built on open standards and blockchain technology, ensuring long-term accessibility and
                interoperability.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-6 text-center">Technology Stack</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Frontend</CardTitle>
              <CardDescription>User interface and experience</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Next.js - React framework for server-side rendering</li>
                <li>Tailwind CSS - Utility-first CSS framework</li>
                <li>shadcn/ui - Component library for consistent design</li>
                <li>Ethers.js - Library for interacting with the Ethereum blockchain</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Backend</CardTitle>
              <CardDescription>Data storage and blockchain integration</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>Ethereum Blockchain - For storing certificate hashes</li>
                <li>Smart Contracts - Written in Solidity for certificate issuance and verification</li>
                <li>MongoDB Atlas - For storing institution data and metadata</li>
                <li>MetaMask - For wallet connection and transaction signing</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6 text-center">Development Team</h2>
        <Card>
          <CardHeader>
            <CardTitle>ISE Department (2021-2025)</CardTitle>
            <CardDescription>Sri Siddhartha Institute of Technology</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Team Members</h3>
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                  <li>Pruthvik B S</li>
                  <li>Rohini T L</li>
                  <li>Rohith T L</li>
                  <li>Varun K T</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-3">Project Guide</h3>
                <p className="text-muted-foreground">Dr. Rashmi HC</p>
                <p className="text-muted-foreground">Assistant Professor</p>
                <p className="text-muted-foreground">Department of Information Science & Engineering</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

