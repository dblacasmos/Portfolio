export interface SkillCategory {
  name: string;
  skills: string[];
}

export const skillCategories: SkillCategory[] = [
  {
    name: "Programming",
    skills: [
      "Java",
      "Python",
      "SQL",
      "Kotlin",
      "Spring Boot",
      "Hibernate",
      "REST APIs",
      "CSS",
    ],
  },
  {
    name: "Data & ML",
    skills: [
      "Data Analysis",
      "Feature Engineering",
      "Machine Learning Algorithms",
      "Pandas",
      "NumPy",
      "scikit-learn",
    ],
  },
  {
    name: "Big Data & Cloud (AWS)",
    skills: [
      "AWS S3",
      "AWS Glue",
      "AWS Redshift",
      "AWS Kinesis",
      "AWS Athena",
      "AWS EMR",
      "AWS Firehose",
      "Spark SQL",
    ],
  },
  {
    name: "Data Visualization & BI",
    skills: ["Power BI", "Data Modeling"],
  },
  {
    name: "Tools & Platforms",
    skills: ["Docker", "GitHub"],
  },
  {
    name: "Familiar With",
    skills: [
      "Computer Vision",
      "Deep Learning",
      "DAX",
      "React",
      "Flutter",
      "Blender",
      "Unity",
      "Odoo",
    ],
  },
];
