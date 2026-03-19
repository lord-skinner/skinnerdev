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

export interface LeadershipPrinciple {
  title: string;
  description: string;
}

export interface ExpertiseCategory {
  category: string;
  items: string[];
}

export const profile = {
  name: "Matthew Skinner",
  intro: "Hello I'm",
  tagline: "AI Strategy & Engineering Leadership",
  email: "mshskinner@gmail.com",
  phone: "(615) 674-9177",
  location: "Nashville, TN",
  about: [
    "I'm Skinner. I've been building things with computers for over 20 years — starting in my grandfather's garage, soldering wires onto microcontroller buses and pushing code down to them. That hands-on instinct stuck. Before coming back to tech, I ran a web development business for a decade, then spent four years in freight operations and procurement — managing 200+ people, $250M in carrier contracts, and national accounts like Walmart and Costco. Those years taught me how big businesses actually work at the operational level.",
    "At Elastic, I lead Cloud Engineering and Data Engineering — two teams, five people, working across the company. I helped design the data architecture for ElasticGPT, our internal AI assistant (2,100+ users, 63 hours saved per employee per year). Right now I'm implementing Apache Iceberg as our data lakehouse foundation and shipping ML into the business — cash forecasting for AR and enabling Sales and Marketing to deploy their own models via BigQuery ML. I manage $1.3M/yr in cloud spend across three CSPs and a vendor portfolio that includes Snowflake, SAP, Fabric, Tableau, and Alteryx.",
    "What I care about: taking AI from demo to production. Safe, predictable systems that people trust and use every day — not science projects. The best AI work starts with understanding how the business actually runs, then building the thing and measuring what changed.",
  ],
};

export const aiVision: string[] = [
  "AI is only useful when it ships and people use it. The gap between a promising prototype and a production service that thousands of people rely on daily is where most AI initiatives fail. That gap is an engineering and change management problem, not a research problem.",
  "I focus on closing that gap. At Elastic, that meant designing the architecture for ElasticGPT, then driving adoption until it hit 2,100+ users and 125K+ chats. It meant designing systems with guardrails that prevent hallucinations and enforce predictable behavior. And it meant sitting with teams across departments to understand their actual workflows before writing a single line of code.",
  "Most enterprise processes were designed around humans doing repetitive work. The tooling has finally caught up. Agentic AI, workflow orchestration, and evaluation frameworks let you automate and augment work that wasn't feasible even two years ago. The teams that move fast and stay disciplined are the ones that pull ahead.",
];

export const leadershipPrinciples: LeadershipPrinciple[] = [
  {
    title: "Build it, then talk about it",
    description: "I stay hands-on. I write code, review architectures, and debug production issues alongside my team. Credibility comes from doing the work, not delegating it.",
  },
  {
    title: "Measure what changed",
    description: "Every initiative needs a number attached to it. ElasticGPT wasn't a success because it was cool — it was a success because we could point to 63 hours saved per employee per year and a 92% jump in daily active users.",
  },
  {
    title: "Ship incrementally",
    description: "Big bang launches fail. I run pilots, collect feedback, iterate, and scale what works. ElasticGPT started with one team before it reached two-thirds of the company.",
  },
  {
    title: "Make it safe to adopt",
    description: "People won't use tools they don't trust. I design AI systems with guardrails, explainability, and predictable behavior from day one. Change management is part of the build, not an afterthought.",
  },
];

export const technicalExpertise: ExpertiseCategory[] = [
  {
    category: "AI & Machine Learning",
    items: [
      "Agentic AI & LLM Orchestration",
      "Generative AI / Chatbot Systems",
      "Reinforcement Learning",
      "Model Fine-Tuning & Hosting",
      "Inference Optimization",
      "AI Safety & Guardrails",
      "MLOps & Evaluation Pipelines",
    ],
  },
  {
    category: "Cloud & Infrastructure",
    items: [
      "Kubernetes & Container Orchestration",
      "Envoy AI Gateway",
      "Kubeflow / ML Platforms",
      "Crossplane / Terraform / IaC",
      "GitOps & CI/CD",
      "Azure / AWS / GCP",
    ],
  },
  {
    category: "Data Platforms",
    items: [
      "Elasticsearch",
      "Kafka / Flink (Streaming)",
      "Spark / Trino (Batch & Interactive)",
      "Data Architecture & Modeling",
      "Data Engineering Pipelines",
    ],
  },
  {
    category: "Leadership & Strategy",
    items: [
      "Cross-Functional Team Leadership",
      "AI Adoption & Change Management",
      "Business Process Analysis",
      "Vendor & Stakeholder Alignment",
      "Cost-Aware System Design",
      "P&L Ownership & Budget Management",
      "SOX / GDPR / PCI Compliance",
    ],
  },
];

export const skills: string[] = [
  "Agentic AI",
  "Generative AI",
  "LLM Orchestration",
  "Reinforcement Learning",
  "Model Fine-Tuning",
  "Inference Optimization",
  "AI Safety & Guardrails",
  "MLOps",
  "Kubernetes",
  "Envoy AI Gateway",
  "Kubeflow",
  "Crossplane",
  "Terraform/IaC",
  "GitOps",
  "Azure/AWS/GCP",
  "Data Engineering",
  "Data Architecture",
  "Elasticsearch",
  "Kafka/Flink",
  "Spark",
  "Python",
  "Team Leadership",
  "Change Management",
  "Business Process Analysis",
  "Vendor Management",
  "P&L Ownership",
  "SOX Compliance",
  "GDPR",
  "PCI",
];

export const services: Service[] = [
  {
    title: "AI Strategy & Delivery",
    description:
      "I find the places where AI actually helps — not every problem is an AI problem. I dig into how teams work, figure out what's worth automating, design the architecture, and measure what changed. ElasticGPT started this way: one workflow problem, one pilot team, then 2,100+ users company-wide.",
  },
  {
    title: "Engineering Leadership",
    description:
      "I run two teams at Elastic covering cloud and data engineering. I hire, coach, and ship alongside my team. I've led change management for AI, data analytics, and ML adoption — the hard part isn't building the tool, it's getting people to trust and use it.",
  },
  {
    title: "AI Infrastructure & Operations",
    description:
      "I design and build the platform layer: inference services, model hosting, evaluation pipelines, and guardrail systems. The goal is AI that's safe, fast, and cheap enough to run at scale — not just accurate in a notebook.",
  },
];

export const education: Education[] = [
  {
    title: "Data Analytics & Visualization Bootcamp",
    institution: "Vanderbilt University",
    period: "2019-2020",
    summary:
      "Intensive certificate covering data wrangling, visualization, statistical analysis, and machine learning.",
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
    summary: "Lead Cloud Engineering and Data Engineering teams (5 reports, cross-functional). Helped design the software and data architecture for ElasticGPT — internal AI assistant with 2,100+ users, 125K+ chats, 400K+ interactions, saving 63 hrs/employee/year (92% DAU increase). Implemented Spark, cutting data processing compute by 270%. Migrated NetSuite from 2,200 objects to 60, enabling SOX-compliant real-time financial reporting and AI-ready data. Manage $1.3M/yr cloud spend and vendor relationships across Snowflake, SAP, Microsoft Fabric, Tableau, Alteryx, and all three major CSPs. Built ML models, ran RL experiments, fine-tuned and hosted models on internal infrastructure. Led change management for AI, data analytics, and ML adoption across departments.",
  },
  {
    role: "Data Analytics Architect",
    company: "Pluralsight, Inc.",
    period: "Apr 2021 - May 2022",
    summary: "Designed enterprise cloud architecture for insights, data engineering, data science, and ML teams. Migrated ML pipelines from batch SageMaker jobs to real-time Kafka-based prediction serving. Managed $30M/yr cloud spend across AWS, SageMaker, and Snowflake.",
  },
  {
    role: "Principal, Data & Integration Architect",
    company: "LP Building Solutions",
    period: "Feb 2020 - Apr 2021",
    summary: "Migrated 29 on-prem manufacturing locations to Azure over 19 months at petabyte scale. Cut data processing time by 70%, enabling real-time manufacturing defect detection. The resulting ~2% defect reduction per plant generated $120M in additional annual revenue — the throughput equivalent of a 30th plant without building one. Built integration layer connecting ERP, supply chain, and logistics systems. Nominated for 2019 Nashville Technology Council Technologist of the Year.",
  },
  {
    role: "Principal, Business Intelligence Developer",
    company: "LP Building Solutions",
    period: "Nov 2018 - Feb 2020",
    summary: "First role back in tech after the operations and procurement years. Built data models and reporting for corporate finance, logistics, and supply chain operations across a $4B revenue manufacturer.",
  },
  {
    role: "Procurement Manager",
    company: "LP Building Solutions",
    period: "2016 - Nov 2018",
    summary: "Managed $250M/year in freight carrier contracts across LP's North American logistics network. Evaluated carriers, negotiated rates, and handled vendor relationships for a $4B manufacturer.",
  },
  {
    role: "Regional Manager",
    company: "Western Express",
    period: "2012 - 2016",
    summary: "Managed freight operations across 37 of 48 operating states, accounting for $10M of $15M in weekly billed freight (67% of company revenue). Oversaw 25 managers, each with 40-50 drivers — over 1,000 people total. Served national accounts including Walmart, Target, Costco, Sam's Club, BJ's, and Campbell's. Reduced driver layover 4.6% month-over-month, decreased deadhead 9% year-over-year, and improved delivery throughput 7.5% for high-volume customers.",
  },
  {
    role: "Owner",
    company: "SkinnerDev.com",
    period: "Aug 2002 - Dec 2012",
    summary: "Ran a web and mobile development shop for 10 years — 185 customers, $3M annual revenue, team of 10. Shipped Android and iOS apps in 2009 with receipt-photo-to-ERP expense parsing — delivering OCR-style functionality years before it was enterprise-ready. Full stack: design, code, deploy, support. Built the business from scratch.",
  },
];

export const certifications: Certification[] = [
  {
    title: "Microsoft Certified: Azure Fundamentals",
    summary:
      "Cloud concepts, Azure services, security, governance, and compliance.",
  },
  {
    title: "Snowflake SnowPro Core Certification",
    summary:
      "Data loading, transformation, performance tuning, concurrency, and data protection.",
  },
  {
    title: "AWS Certified Cloud Practitioner",
    summary:
      "Compute, storage, networking, security, pricing models, and operational best practices.",
  },
];

export const recognition: string[] = [
  "2019 Nashville Technology Council Technologist of the Year Nominee",
  "Speaker at Microsoft, Snowflake, dbt, and GCP community meetups",
  "SOX, GDPR, and PCI compliance experience",
];
