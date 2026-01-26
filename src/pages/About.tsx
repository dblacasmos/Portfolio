import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  GraduationCap,
  Globe,
  Award,
  MapPin,
  Mail,
  Phone,
} from "lucide-react";
import Container from "@/components/layout/Container";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { profile, education } from "@/data/profile";
import { skillCategories } from "@/data/skills";

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

export default function About() {
  useEffect(() => {
    document.title = "About | David Blanco Casasola";
  }, []);

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
              About <span className="text-gradient">Me</span>
            </h1>
            <p className="mt-4 text-slate200 max-w-2xl mx-auto">
              Learn more about my background, skills, and journey
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <Card hover={false}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-orange500/10 rounded-xl">
                    <User className="w-6 h-6 text-orange500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate50">
                      {profile.name}
                    </h2>
                    <p className="text-teal400">{profile.role}</p>
                  </div>
                </div>

                <p className="text-slate200 leading-relaxed mb-6">
                  {profile.summary}
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 text-slate200">
                    <MapPin className="w-5 h-5 text-slate200/60" />
                    {profile.location}
                  </div>
                  <div className="flex items-center gap-3 text-slate200">
                    <Mail className="w-5 h-5 text-slate200/60" />
                    {profile.emails.primary}
                  </div>
                  <div className="flex items-center gap-3 text-slate200">
                    <Phone className="w-5 h-5 text-slate200/60" />
                    {profile.phone}
                  </div>
                  <div className="flex items-center gap-3 text-slate200">
                    <Globe className="w-5 h-5 text-slate200/60" />
                    {profile.languages[0].name}: {profile.languages[0].level}
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card hover={false} className="h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-teal400/10 rounded-lg">
                    <GraduationCap className="w-5 h-5 text-teal400" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate50">
                    Education
                  </h2>
                </div>

                <div className="space-y-6">
                  {education.map((edu, index) => (
                    <div key={index}>
                      <h3 className="font-semibold text-slate50 text-sm">
                        {edu.title}
                      </h3>
                      <p className="text-teal400 text-sm">{edu.institution}</p>
                      <p className="text-xs text-slate200/60 mt-1">
                        {edu.period}
                      </p>
                      <p className="text-sm text-slate200 mt-2">
                        {edu.description}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange500/10 rounded-lg">
                <Award className="w-5 h-5 text-orange500" />
              </div>
              <h2 className="text-2xl font-bold text-slate50">
                Skills & Technologies
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {skillCategories.map((category, index) => (
                <motion.div
                  key={category.name}
                  variants={itemVariants}
                  custom={index}
                  className="bg-slate800/30 border border-slate700/50 rounded-xl p-5"
                >
                  <h3 className="text-sm font-semibold text-slate50 uppercase tracking-wider mb-4">
                    {category.name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {category.skills.map((skill) => (
                      <Badge
                        key={skill}
                        variant={
                          category.name === "Programming" ||
                          category.name === "Big Data & Cloud (AWS)"
                            ? "primary"
                            : category.name === "Data & ML" ||
                                category.name === "Data Visualization & BI"
                              ? "secondary"
                              : "default"
                        }
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </Container>
    </motion.main>
  );
}
