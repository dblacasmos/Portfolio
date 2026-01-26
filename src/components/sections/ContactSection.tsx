import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Github,
  Linkedin,
  Copy,
  Check,
  ArrowUpRight,
  MessageSquare,
} from "lucide-react";
import Container from "@/components/layout/Container";
import Section from "@/components/layout/Section";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Toast from "@/components/ui/Toast";
import { profile } from "@/data/profile";
import { copyToClipboard, cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export default function ContactSection() {
  const prefersReducedMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const handleCopyEmail = async () => {
    await copyToClipboard(profile.emails.primary);
    setCopied(true);
    setToastVisible(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        delayChildren: prefersReducedMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : 30,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0.2 : 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <Section id="contact" className="bg-slate900/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-t from-orange500/10 via-transparent to-transparent blur-[80px] opacity-50" />
      </div>

      <Container className="relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-12">
            <motion.span
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-medium text-orange500 bg-orange500/10 border border-orange500/20 rounded-full"
            >
              <MessageSquare className="w-3 h-3" />
              Contact
            </motion.span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate50">
              Let's Work <span className="text-gradient">Together</span>
            </h2>
            <p className="mt-4 text-slate200 max-w-2xl mx-auto">
              Have a project in mind or want to collaborate? I'd love to hear from you.
            </p>
          </motion.div>

          {/* Premium CTA Card */}
          <motion.div
            variants={itemVariants}
            className="max-w-4xl mx-auto mb-12"
          >
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-orange500/20 via-teal400/20 to-orange500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-500" />

              {/* Card */}
              <div className="relative bg-gradient-to-br from-slate800/80 to-slate900/80 backdrop-blur-xl border border-slate700/50 rounded-2xl p-8 md:p-10">
                {/* Spotlight effect */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden">
                  <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-white/3 to-transparent rotate-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                </div>

                <div className="relative">
                  {/* Top row - Quick actions */}
                  <div className="grid sm:grid-cols-3 gap-4 mb-8">
                    {/* Email CTA */}
                    <motion.a
                      href={`mailto:${profile.emails.primary}`}
                      whileHover={prefersReducedMotion ? {} : { y: -4, scale: 1.02 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      className="group/btn flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-orange500/10 to-orange600/5 border border-orange500/20 rounded-xl hover:border-orange500/40 hover:shadow-lg hover:shadow-orange500/10 transition-all duration-300 focus-ring"
                    >
                      <div className="p-3 bg-orange500/20 rounded-xl group-hover/btn:bg-orange500/30 transition-colors">
                        <Mail className="w-6 h-6 text-orange500" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate50 group-hover/btn:text-orange300 transition-colors">
                          Email Me
                        </p>
                        <p className="text-xs text-slate200/60 mt-0.5">Quick response</p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-orange500 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                    </motion.a>

                    {/* LinkedIn CTA */}
                    <motion.a
                      href={profile.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={prefersReducedMotion ? {} : { y: -4, scale: 1.02 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      className="group/btn flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-teal400/10 to-teal500/5 border border-teal400/20 rounded-xl hover:border-teal400/40 hover:shadow-lg hover:shadow-teal400/10 transition-all duration-300 focus-ring"
                    >
                      <div className="p-3 bg-teal400/20 rounded-xl group-hover/btn:bg-teal400/30 transition-colors">
                        <Linkedin className="w-6 h-6 text-teal400" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate50 group-hover/btn:text-teal300 transition-colors">
                          LinkedIn
                        </p>
                        <p className="text-xs text-slate200/60 mt-0.5">Let's connect</p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-teal400 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                    </motion.a>

                    {/* GitHub CTA */}
                    <motion.a
                      href={profile.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={prefersReducedMotion ? {} : { y: -4, scale: 1.02 }}
                      whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
                      className="group/btn flex flex-col items-center gap-3 p-5 bg-gradient-to-br from-slate700/30 to-slate800/30 border border-slate600/30 rounded-xl hover:border-slate500/50 hover:shadow-lg hover:shadow-slate500/10 transition-all duration-300 focus-ring"
                    >
                      <div className="p-3 bg-slate700/50 rounded-xl group-hover/btn:bg-slate600/50 transition-colors">
                        <Github className="w-6 h-6 text-slate200" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-slate50 group-hover/btn:text-slate100 transition-colors">
                          GitHub
                        </p>
                        <p className="text-xs text-slate200/60 mt-0.5">View my work</p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate400 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                    </motion.a>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="flex-grow h-px bg-gradient-to-r from-transparent via-slate700 to-transparent" />
                    <span className="text-xs text-slate200/40 uppercase tracking-wider">Or</span>
                    <div className="flex-grow h-px bg-gradient-to-r from-transparent via-slate700 to-transparent" />
                  </div>

                  {/* Contact details */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    {/* Email with copy */}
                    <div className="flex items-center gap-4 p-4 bg-slate800/30 rounded-xl border border-slate700/30">
                      <div className="p-2.5 bg-orange500/10 rounded-lg">
                        <Mail className="w-5 h-5 text-orange500" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-xs text-slate200/60 mb-0.5">Email</p>
                        <p className="text-sm text-slate50 truncate">{profile.emails.primary}</p>
                      </div>
                      <motion.button
                        onClick={handleCopyEmail}
                        whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                        whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
                        className={cn(
                          "p-2 rounded-lg transition-all duration-200 focus-ring",
                          copied
                            ? "bg-teal400/20 text-teal400"
                            : "bg-slate700/50 text-slate200 hover:bg-slate600/50 hover:text-slate50"
                        )}
                        aria-label={copied ? "Copied" : "Copy email"}
                      >
                        {copied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </motion.button>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center gap-4 p-4 bg-slate800/30 rounded-xl border border-slate700/30">
                      <div className="p-2.5 bg-teal400/10 rounded-lg">
                        <Phone className="w-5 h-5 text-teal400" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-xs text-slate200/60 mb-0.5">Phone</p>
                        <p className="text-sm text-slate50">{profile.phone}</p>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-4 p-4 bg-slate800/30 rounded-xl border border-slate700/30 sm:col-span-2">
                      <div className="p-2.5 bg-slate700/50 rounded-lg">
                        <MapPin className="w-5 h-5 text-slate200" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-xs text-slate200/60 mb-0.5">Location</p>
                        <p className="text-sm text-slate50">{profile.location}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div variants={itemVariants} className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-slate50 mb-2">
                Send a Message
              </h3>
              <p className="text-sm text-slate200/60">
                Fill out the form below and I'll get back to you as soon as possible
              </p>
            </div>

            <form
              className="space-y-5 bg-slate800/20 border border-slate700/30 rounded-xl p-6 md:p-8"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="grid sm:grid-cols-2 gap-5">
                <Input label="Name" placeholder="Your name" required />
                <Input
                  label="Email"
                  type="email"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <Textarea
                label="Message"
                placeholder="Tell me about your project or just say hi..."
                rows={5}
                required
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="lg"
                  icon={<Mail className="w-4 h-4" />}
                  className="w-full sm:w-auto"
                >
                  Send Message
                </Button>
              </div>
            </form>
          </motion.div>

          {/* Footer note */}
          <motion.p
            variants={itemVariants}
            className="text-center text-sm text-slate200/40 mt-12"
          >
            Currently available for internships and freelance opportunities
          </motion.p>
        </motion.div>
      </Container>

      <Toast
        message="Email copied to clipboard!"
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </Section>
  );
}
