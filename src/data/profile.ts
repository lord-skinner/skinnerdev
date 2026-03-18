export interface Service {
  title: string;
  description: string;
}

export interface Education {
  title: string;
  institution: string;
  period: string;
  summary: string;
}

export interface Experience {
  role: string;
  company: string;
  period: string;
  summary: string;
}

export interface Certification {
  title: string;
  summary: string;
}

export const profile = {
  name: "Matthew Skinner",
  intro: "Hello I'm",
  email: "mshskinner@gmail.com",
  phone: "(615) 674-9177",
  location: "Nashville, TN",
  about: [
    "Hello, I'm Matthew. You can call me Skinner. I'm a father, husband, nerd, and an experienced developer. Outside of work, my passions include golfing, spending time with my family, the Green Bay Packers, and building things.",
    "I spent my childhood summers hacking on things in my grandfather's garage, soldering wires onto the hardware bus of microcontrollers and learning to compile and push my own code down to them. I formed a real passion for building and tech early on and have been fortunate enough to turn that passion into a career.",
    "I spent my early career doing what is now called full stack development. I built a small business around web design and development from 2002 to 2012. From there, I took a short break from tech to learn business and management, contracts, procurement, and operations.",
    "In 2018, I found my way back to tech. I quickly realized that data is at the core of everything we do in software and infrastructure, and I dove head first into data engineering, data architecture, and cloud architecture.",
  ],
};

export const skills: string[] = [
  "Leading Data Engineering Team",
  "Leading Cloud Engineering Team",
  "SRE/SDR Functions",
  "Cloud Platform Engineering",
  "Kubernetes",
  "Crossplane",
  "Cilium",
  "Kyverno",
  "Envoy",
  "Envoy AI Gateway",
  "Kubeflow",
  "AI Inference Services",
  "MLOps",
  "Machine Learning",
  "Reinforcement Learning",
  "Model Fine-Tuning",
  "Data Engineering",
  "Data Architecture",
  "Streaming Data Platforms",
  "Spark",
  "Kafka/Flink",
  "Python",
  "Terraform/IaC",
  "GitOps",
  "Azure/AWS/GCP",
  "Platform Reliability",
  "And More...",
];

export const services: Service[] = [
  {
    title: "Data Engineering",
    description:
      "Lead teams to build best-in-class data solutions using proven methodologies, open data standards, and next-generation technologies to ensure scalability, reliability, and performance.",
  },
  {
    title: "Cloud Architecture",
    description:
      "Design scalable, secure, and highly available cloud architectures using GitOps, clustered compute standards such as Spark/Trino, and resilient stream processing platforms such as Kafka and Flink.",
  },
  {
    title: "Development",
    description:
      "Work across multiple programming languages and highly complex environments to build efficient, maintainable solutions grounded in first-principles problem solving.",
  },
];

export const education: Education[] = [
  {
    title: "Data Analytics & Visualization Bootcamp",
    institution: "Vanderbilt University",
    period: "2019-2020",
    summary:
      "Completed an intensive certificate program covering data wrangling, visualization, statistical analysis, and machine learning.",
  },
  {
    title: "AAS in Business Administration and Management",
    institution: "Volunteer State Community College",
    period: "2006-2007",
    summary: "Associate of Applied Science in Business Administration and Management.",
  },
  {
    title: "Diploma",
    institution: "White House High School",
    period: "2000-2003",
    summary: "2004 Graduate - Technical Path.",
  },
];

export const experience: Experience[] = [
  {
    role: "Senior Manager, Data Engineering & Architecture",
    company: "Elastic, Inc.",
    period: "May 2022 - Present",
    summary: "Managing Data Engineering and Architecture teams to deliver high-quality data solutions.",
  },
  {
    role: "Data Analytics Architect",
    company: "Pluralsight, Inc.",
    period: "Apr 2021 - May 2022",
    summary: "Enterprise cloud architecture for insights, data engineering, data science, and machine learning.",
  },
  {
    role: "Principal, Data & Integration Architect",
    company: "LP Building Solutions",
    period: "Feb 2020 - Apr 2021",
    summary: "Enterprise cloud data architecture and application integration.",
  },
  {
    role: "Principal, Business Intelligence Developer",
    company: "LP Building Solutions",
    period: "Nov 2018 - Feb 2020",
    summary: "Corporate finance, logistics, supply chain, and operational data modeling and reporting.",
  },
  {
    role: "Owner",
    company: "SkinnerDev.com",
    period: "Aug 2002 - Dec 2012",
    summary: "Full stack web and mobile app development.",
  },
];

export const certifications: Certification[] = [
  {
    title: "Microsoft Certified: Azure Fundamentals",
    summary:
      "Covered cloud concepts, Azure services, security, governance, and compliance.",
  },
  {
    title: "Snowflake SnowPro Core Certification",
    summary:
      "Covered data loading and transformation, performance, concurrency, sharing, and data protection.",
  },
  {
    title: "AWS Certified Cloud Practitioner",
    summary:
      "Covered services and concepts for pricing, compute, storage, networking, security, and logging.",
  },
];
