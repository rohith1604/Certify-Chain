import Link from "next/link"
import { Facebook, Github, Instagram, Linkedin, Twitter, Youtube } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container px-4 md:px-6 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative h-8 w-8 overflow-hidden rounded-full bg-primary">
                <div className="absolute inset-0 flex items-center justify-center text-primary-foreground font-bold text-lg">
                  C
                </div>
              </div>
              <span className="font-poppins font-bold text-xl">
                Certify<span className="text-primary">Chain</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Secure, immutable, and verifiable certificates on the blockchain
            </p>
            <div className="flex space-x-4">
              <Link href="https://www.facebook.com/1979principal" className="text-muted-foreground hover:text-primary">
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link href="https://www.youtube.com/channel/UCRP-M8i9D_LIcDJzsBTvFPQ" className="text-muted-foreground hover:text-primary">
                <Youtube className="h-5 w-5" />
                <span className="sr-only">Youtube</span>
              </Link>
              <Link href="https://twitter.com/SSIT_TUMKUR?s=08" className="text-muted-foreground hover:text-primary">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">X (Twitter)</span>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <Linkedin className="h-5 w-5" />
                <span className="sr-only">LinkedIn</span>
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-primary">
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-primary">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/verify" className="text-muted-foreground hover:text-primary">
                  Verify Certificate
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-muted-foreground hover:text-primary">
                  Institution Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-muted-foreground hover:text-primary">
                  Register Institution
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary">
                  About
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Institution</h3>
            <address className="not-italic text-sm text-muted-foreground space-y-2">
              <p>Sri Siddhartha Institute of Technology</p>
              <p>839V+8G9, Kunigal-Tumkur Rd, Saraswathipuram, Tumakuru, Karnataka 572105</p>
              <p>Karnataka, India</p>
              <p>
                <a
                  href="https://www.ssit.edu.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary"
                >
                  www.ssit.edu.in
                </a>
              </p>
            </address>
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Development Team</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>ISE Department (2021-2025)</p>
              <ul className="space-y-1">
                <li>Pruthvik B S</li>
                <li>Rohini T L</li>
                <li>Rohith T L</li>
                <li>Varun K T</li>
              </ul>
              <p className="pt-2">Guide: Dr. Rashmi HC</p>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Certify Chain by SSIT. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

