// Logo data for the homepage "AI tools" and "tech stack" grids. Logos are
// fetched live from LogoKit by domain; `usage` is shown in the hover tooltip.

export interface LogoItem {
  name: string;
  domain: string;
  usage: string;
}

export function logoKitUrl(domain: string, size = 128): string {
  const token = process.env.NEXT_PUBLIC_LOGOKIT_TOKEN;
  return `https://img.logokit.com/${domain}?token=${token}&size=${size}&format=png&fallback=monogram`;
}

export const AI_TOOLS_LOGOS: LogoItem[] = [
  { name: "Claude (Anthropic)", domain: "anthropic.com", usage: "Primary AI for coding, agents & content" },
  { name: "Codex (OpenAI)", domain: "openai.com", usage: "Code generation & AI pair programming" },
  { name: "Gemini (Google)", domain: "google.com", usage: "Multimodal AI & research" },
  { name: "Higgsfield AI", domain: "higgsfield.ai", usage: "AI video & image generation" },
  { name: "ElevenLabs", domain: "elevenlabs.io", usage: "Voice cloning & text-to-speech" },
  { name: "Retell AI", domain: "retellai.com", usage: "Conversational voice AI agents" },
  { name: "Twilio Conversation AI", domain: "twilio.com", usage: "AI-powered SMS & voice conversations" },
  { name: "NVIDIA SDKs & Dev Tools", domain: "nvidia.com", usage: "GPU-accelerated AI development" },
  { name: "GitHub Copilot", domain: "github.com", usage: "In-editor AI code completion" },
  { name: "n8n", domain: "n8n.io", usage: "AI-powered workflow automation" },
  { name: "Perplexity", domain: "perplexity.ai", usage: "AI-powered research & search" },
];

// Mirrors the resume's "Languages & Frameworks" / "Tools & Cloud" / "Libraries & AI"
// skill categories, plus the SaaS platforms used to build this site.
export const TECH_STACK_LOGOS: LogoItem[] = [
  // Languages & Frameworks
  { name: "Python", domain: "python.org", usage: "General-purpose programming language" },
  { name: "C/C++", domain: "isocpp.org", usage: "Systems & performance-critical programming" },
  { name: "Java", domain: "dev.java", usage: "Enterprise & backend programming language" },
  { name: "TypeScript", domain: "typescriptlang.org", usage: "Typed JavaScript" },
  { name: "JavaScript", domain: "javascript.com", usage: "Core web scripting language" },
  { name: "Next.js", domain: "nextjs.org", usage: "React framework powering this site" },
  { name: "React", domain: "react.dev", usage: "UI component library" },
  { name: "React Native", domain: "reactnative.dev", usage: "Cross-platform mobile apps" },
  { name: "Expo", domain: "expo.dev", usage: "React Native tooling & builds" },
  { name: "Node.js", domain: "nodejs.org", usage: "JavaScript runtime for servers" },
  { name: "FastAPI", domain: "fastapi.tiangolo.com", usage: "Python web API framework" },
  { name: "Tailwind CSS", domain: "tailwindcss.com", usage: "Utility-first styling" },
  { name: "HTML/CSS", domain: "w3.org", usage: "Core web markup & styling" },

  // Tools & Cloud
  { name: "PostgreSQL", domain: "postgresql.org", usage: "Relational database" },
  { name: "MongoDB", domain: "mongodb.com", usage: "Primary NoSQL database for this site" },
  { name: "Redis", domain: "redis.io", usage: "In-memory caching & queues" },
  { name: "Upstash", domain: "upstash.com", usage: "Serverless Redis & rate limiting" },
  { name: "Docker", domain: "docker.com", usage: "Containerized app deployment" },
  { name: "Git", domain: "git-scm.com", usage: "Version control" },
  { name: "GitHub", domain: "github.com", usage: "Version control & collaboration" },
  { name: "Cursor", domain: "cursor.com", usage: "AI-powered code editor" },
  { name: "Nginx", domain: "nginx.com", usage: "Reverse proxy & web server" },
  { name: "Ubuntu/Linux", domain: "ubuntu.com", usage: "Server operating system" },
  { name: "CI/CD (GitHub Actions)", domain: "github.com", usage: "Automated build, test & deploy pipelines" },
  { name: "Agile/Scrum", domain: "atlassian.com", usage: "Iterative project management" },
  { name: "Jira/Confluence", domain: "atlassian.com", usage: "Project tracking & documentation" },
  { name: "RESTful API", domain: "postman.com", usage: "Designing & consuming HTTP APIs" },
  { name: "Stripe", domain: "stripe.com", usage: "Payments & subscription billing" },
  { name: "Cloudflare", domain: "cloudflare.com", usage: "CDN, DNS & edge security" },
  { name: "AWS (EC2, S3, RDS, IAM, SAM CLI, Lambda)", domain: "aws.amazon.com", usage: "Cloud infrastructure & storage" },
  { name: "Vercel/Netlify", domain: "vercel.com", usage: "Hosting & deployment for this site" },
  { name: "Supabase", domain: "supabase.com", usage: "Postgres backend-as-a-service" },
  { name: "Railway", domain: "railway.app", usage: "App hosting & deployment" },
  { name: "Clerk", domain: "clerk.com", usage: "User authentication & management" },
  { name: "Twilio", domain: "twilio.com", usage: "SMS, voice & notifications" },
  { name: "SendGrid", domain: "sendgrid.com", usage: "Transactional email delivery" },
  { name: "Resend", domain: "resend.com", usage: "Developer-first email API" },

  // Libraries & AI
  { name: "pandas", domain: "pandas.pydata.org", usage: "Python data analysis" },
  { name: "NumPy", domain: "numpy.org", usage: "Numerical computing in Python" },
  { name: "OpenCV", domain: "opencv.org", usage: "Computer vision library" },
  { name: "pgvector", domain: "postgresql.org", usage: "Vector similarity search in Postgres" },
  { name: "Matplotlib", domain: "matplotlib.org", usage: "Python data visualization" },
  { name: "Spring", domain: "spring.io", usage: "Java backend framework" },
];
