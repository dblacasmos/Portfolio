import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  Github,
  Linkedin,
  Copy,
  Check,
  Send,
  ExternalLink,
} from "lucide-react";
import Container from "@/components/layout/Container";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Toast from "@/components/ui/Toast";
import { profile } from "@/data/profile";
import { copyToClipboard } from "@/lib/utils";

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Contact() {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    document.title = "Contact | David Blanco Casasola";
  }, []);

  const handleCopyEmail = async (email: string) => {
    await copyToClipboard(email);
    setCopiedEmail(email);
    setToastMessage("Email copied to clipboard!");
    setToastVisible(true);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setToastMessage("Message sent successfully!");
    setToastVisible(true);
  };

  return (
    <motion.main
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="pt-24 pb-16 min-h-screen"
    >
      <Container>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-slate50">
              Get In <span className="text-gradient">Touch</span>
            </h1>
            <p className="mt-4 text-slate200 max-w-2xl mx-auto">
              Have a project in mind or want to collaborate? I'd love to hear
              from you!
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div variants={itemVariants}>
              <Card hover={false}>
                <h2 className="text-xl font-semibold text-slate50 mb-6">
                  Send a Message
                </h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <Input label="Name" placeholder="Your name" required />
                  <Input
                    label="Email"
                    type="email"
                    placeholder="your@email.com"
                    required
                  />
                  <Input label="Subject" placeholder="What's this about?" />
                  <Textarea
                    label="Message"
                    placeholder="Tell me about your project or idea..."
                    rows={6}
                    required
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    icon={<Send className="w-4 h-4" />}
                    iconPosition="right"
                  >
                    Send Message
                  </Button>
                </form>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-6">
              <Card hover={false}>
                <h2 className="text-xl font-semibold text-slate50 mb-6">
                  Contact Information
                </h2>

                <div className="space-y-5">
                  <ContactItem
                    icon={Mail}
                    iconBg="bg-orange500/10"
                    iconColor="text-orange500"
                    label="Primary Email"
                    value={profile.emails.primary}
                    action={
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyEmail(profile.emails.primary)}
                        icon={
                          copiedEmail === profile.emails.primary ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )
                        }
                      >
                        {copiedEmail === profile.emails.primary
                          ? "Copied!"
                          : "Copy"}
                      </Button>
                    }
                  />

                  <ContactItem
                    icon={Mail}
                    iconBg="bg-teal400/10"
                    iconColor="text-teal400"
                    label="Secondary Email"
                    value={profile.emails.secondary}
                    action={
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopyEmail(profile.emails.secondary)
                        }
                        icon={
                          copiedEmail === profile.emails.secondary ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )
                        }
                      >
                        {copiedEmail === profile.emails.secondary
                          ? "Copied!"
                          : "Copy"}
                      </Button>
                    }
                  />

                  <ContactItem
                    icon={Phone}
                    iconBg="bg-slate700/50"
                    iconColor="text-slate200"
                    label="Phone"
                    value={profile.phone}
                  />

                  <ContactItem
                    icon={MapPin}
                    iconBg="bg-slate700/50"
                    iconColor="text-slate200"
                    label="Location"
                    value={profile.location}
                  />
                </div>
              </Card>

              <Card hover={false}>
                <h2 className="text-xl font-semibold text-slate50 mb-6">
                  Connect With Me
                </h2>

                <div className="space-y-3">
                  <SocialLink
                    href={profile.github}
                    icon={Github}
                    label="GitHub"
                    username="dblacasmos"
                  />
                  <SocialLink
                    href={profile.linkedin}
                    icon={Linkedin}
                    label="LinkedIn"
                    username="dblacasmos"
                  />
                  <SocialLink
                    href={profile.portfolio}
                    icon={ExternalLink}
                    label="Portfolio"
                    username="dblacasmos.dev"
                  />
                </div>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </Container>

      <Toast
        message={toastMessage}
        isVisible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
    </motion.main>
  );
}

interface ContactItemProps {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  action?: React.ReactNode;
}

function ContactItem({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  action,
}: ContactItemProps) {
  return (
    <div className="flex items-center gap-4">
      <div className={`p-3 ${iconBg} rounded-xl`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-grow min-w-0">
        <p className="text-sm text-slate200/60">{label}</p>
        <p className="text-slate50 truncate">{value}</p>
      </div>
      {action}
    </div>
  );
}

interface SocialLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  username: string;
}

function SocialLink({ href, icon: Icon, label, username }: SocialLinkProps) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ x: 4 }}
      className="flex items-center gap-4 p-3 bg-slate800/30 border border-slate700/50 rounded-xl hover:border-orange500/30 hover:bg-slate800/50 transition-colors focus-ring"
    >
      <div className="p-2 bg-slate700/50 rounded-lg">
        <Icon className="w-5 h-5 text-slate200" />
      </div>
      <div className="flex-grow">
        <p className="font-medium text-slate50">{label}</p>
        <p className="text-sm text-slate200/60">{username}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-slate200/40" />
    </motion.a>
  );
}
