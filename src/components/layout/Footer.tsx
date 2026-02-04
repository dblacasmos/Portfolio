import { Github, Linkedin, Mail, Terminal } from "lucide-react";
import { Link } from "react-router-dom";
import Container from "./Container";
import { profile } from "@/data/profile";

const socialLinks = [
  { icon: Github, href: profile.github, label: "GitHub" },
  { icon: Linkedin, href: profile.linkedin, label: "LinkedIn" },
  { icon: Mail, href: `mailto:${profile.emails.primary}`, label: "Email" },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate700/50 bg-slate900/50">
      <Container>
        <div className="py-8 md:py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-orange500" />
              <span className="text-slate200 font-medium">{profile.name}</span>
            </div>

            <nav className="flex items-center gap-6">
              <Link
                to="/"
                className="text-sm text-slate200 hover:text-slate50 transition-colors focus-ring rounded"
              >
                Home
              </Link>
              <Link
                to="/projects"
                className="text-sm text-slate200 hover:text-slate50 transition-colors focus-ring rounded"
              >
                Projects
              </Link>
              <Link
                to="/about"
                className="text-sm text-slate200 hover:text-slate50 transition-colors focus-ring rounded"
              >
                About
              </Link>
              <Link
                to="/contact"
                className="text-sm text-slate200 hover:text-slate50 transition-colors focus-ring rounded"
              >
                Contact
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate200 hover:text-orange500 transition-colors focus-ring rounded-lg"
                  aria-label={link.label}
                >
                  <link.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate700/50 text-center">
            <p className="text-sm text-slate200/60">
              © {new Date().getFullYear()} {profile.name}. Built with React, Tailwind & Framer Motion.
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
