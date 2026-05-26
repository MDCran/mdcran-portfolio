import type { SiteContent } from "./types";

export const defaultSiteContent: SiteContent = {
  id: "site-content",
  brandLogoUrl: "/cdn/WEB_ASSETS/LOGOS/AI_MDCRAN_BLUE.png",
  faviconUrl: "/cdn/WEB_ASSETS/LOGOS/AI_MDCRAN_BLUE.png",
  homeSectionOrder: [
    "hero",
    "stats",
    "about",
    "timeline",
    "services",
    "featured",
    "clients",
    "visitor-map",
    "cta",
  ],
  announcementBanner: {
    enabled: false,
    message: "",
    icon: "",
    bgColor: "#ef4242",
    textColor: "#ffffff",
    align: "center",
    ctaLabel: "",
    ctaHref: "",
    startsAt: "",
    endsAt: "",
  },
  featuredProjectIds: [],
  featuredArticleIds: [],
  featuredWorkOrder: [],
  featuredClientIds: [],
  homeHero: {
    eyebrow: "Software Engineer",
    titlePrimary: "MD",
    titleAccent: "CRAN",
    description:
      "Designing and building digital projects for creators, companies, and secure enterprise platforms.",
    supportingText: "B.S. in Computer Science @UCF",
    locationText: "Orlando, FL - OPEN FOR WORK",
    serviceTags: [
      { label: "Minecraft Maps", href: "/arts-and-entertainment/minecraft-maps" },
      { label: "Events", href: "/arts-and-entertainment/events" },
      { label: "Thumbnail Design", href: "/motion-and-graphics/thumbnail-design" },
      { label: "Video Editing", href: "/motion-and-graphics/video-editing" },
      { label: "Web Dev & Design", href: "/motion-and-graphics/web-dev-design" },
    ],
    primaryCta: { label: "View Work", href: "/work" },
    secondaryCta: { label: "Contact Me", href: "/contact" },
    tertiaryCta: { label: "Resume", href: "/resume" },
  },
  homeAbout: {
    eyebrow: "The Person Behind the Work",
    title: "Michael Cran",
    description:
      "I am a graduate of the University of Central Florida, where I earned a Bachelor of Science in Computer Science. I am a developer focused on building one-of-a-kind digital experiences that put a smile on people's faces. Over the past 8+ years, I've worked as a content manager, developer, map designer, and builder for some of the internet's most inspiring creators and teams. What started as a casual gaming session at a soccer field evolved into a career building secure enterprise software, platforms, and custom systems that support real users and large online communities.",
    supportingText: "Based in Orlando, FL - OPEN FOR WORK",
    tags: ["Builder", "Designer", "Developer", "Creator"],
    images: [
      { src: "/cdn/WEB_ASSETS/ME/age_3.jpg", alt: "Michael Cran" },
      { src: "/cdn/WEB_ASSETS/ME/age_4.jpg", alt: "Michael Cran" },
    ],
  },
  homeStats: {
    eyebrow: "By the Numbers",
    metrics: [
      { key: "totalFollowers", label: "Client Followers", description: "Combined across all clients" },
      { key: "totalProjectViews", label: "Project Views", description: "Total views on embedded content" },
      { key: "totalProjects", label: "Public Projects", description: "Maps, designs, events & more" },
      { key: "yearsActive", label: "Creating", description: "Continuously since 2018" },
    ],
  },
  homeTimeline: {
    eyebrow: "Career",
    title: "Experience",
    description: "",
  },
  homeServices: {
    eyebrow: "What I do",
    title: "Services",
    description:
      "Browse Minecraft projects and graphics, as well as the software, web applications, and custom secure systems I develop today.",
    cards: [
      {
        title: "Arts & Entertainment",
        description:
          "Custom Minecraft maps and immersive events for the world's biggest gaming creators.",
        href: "/arts-and-entertainment",
        items: ["Minecraft Maps", "Events"],
      },
      {
        title: "Motion & Graphics",
        description:
          "Thumbnail design, video editing, and graphics I've made for creators and online projects.",
        href: "/motion-and-graphics",
        items: ["Thumbnails", "Video Editing", "Web Design"],
      },
      {
        title: "Code",
        description:
          "Development of secure software, backend systems, web applications, plugins and more...",
        href: "/code",
        items: ["Minecraft Plugins", "Web Apps", "Internal Tools"],
      },
    ],
  },
  homeFeaturedWork: {
    eyebrow: "Portfolio",
    title: "Featured Work",
    description: "Featured projects pulled automatically from the portfolio.",
    ctaLabel: "View all projects",
    ctaHref: "/work",
  },
  homeClients: {
    eyebrow: "Who I've worked with",
    title: "Clients",
    description:
      "Collaborating with top content creators, companies, and production teams to deliver premium-quality digital experiences.",
  },
  homeVisitorMap: {
    eyebrow: "Global Reach",
    title: "Visitor Map",
    description: "See where visitors are tuning in from around the world.",
  },
  homeCta: {
    eyebrow: "Open for work",
    title: "Let's Build It Right",
    description:
      "Have a project in mind? Whether it's game development, a web application, custom software, or digital content, I'm ready to help bring it to life.",
    ctaLabel: "Contact Me",
    ctaHref: "/contact",
  },
  artsAndEntertainment: {
    eyebrow: "Category",
    title: "Arts & Entertainment",
    description:
      "Custom Minecraft maps and immersive events for the world's biggest gaming creators.",
    cards: [
      {
        title: "Minecraft Maps",
        description: "Custom-built Minecraft experiences for the world's biggest YouTubers.",
        href: "/arts-and-entertainment/minecraft-maps",
        count: "20+ Maps",
      },
      {
        title: "Events",
        description: "Large-scale competitive and community Minecraft events.",
        href: "/arts-and-entertainment/events",
        count: "5+ Events",
      },
    ],
  },
  motionAndGraphics: {
    eyebrow: "Category",
    title: "Motion & Graphics",
    description:
      "Thumbnail design, video editing, and graphics I've made for creators and online projects.",
    cards: [
      {
        title: "Thumbnail Design",
        description: "Eye-catching thumbnails for gaming and entertainment content.",
        href: "/motion-and-graphics/thumbnail-design",
      },
      {
        title: "Video Editing",
        description: "Fast, on-demand video editing for YouTube and social media.",
        href: "/motion-and-graphics/video-editing",
      },
      {
        title: "Web Dev & Design",
        description: "Modern, premium web experiences for creators, companies and brands.",
        href: "/motion-and-graphics/web-dev-design",
      },
    ],
  },
  workPage: {
    eyebrow: "Portfolio",
    title: "Work",
    description: "Jump into every major section of the site from one place.",
    cards: [
      {
        title: "Arts & Entertainment",
        description: "Minecraft maps, events, and interactive experiences.",
        href: "/arts-and-entertainment",
        items: ["Minecraft Maps", "Events"],
      },
      {
        title: "Motion & Graphics",
        description: "Creative services for content and brands.",
        href: "/motion-and-graphics",
        items: ["Thumbnail Design", "Video Editing", "Web Dev & Design"],
      },
      {
        title: "Code",
        description: "Software, systems, tools, and web applications.",
        href: "/code",
        items: [],
      },
      {
        title: "Articles",
        description: "Writing, updates, guides, and stories.",
        href: "/articles",
        items: [],
      },
    ],
  },
  codePage: {
    eyebrow: "Development",
    title: "Code",
    description:
      "Design and development of secure software, backend systems, web applications, and custom plugins.",
  },
  pageHeaders: {
    publications: {
      eyebrow: "Category",
      title: "Publications",
      description: "Creative storyline writing, world-building, and narrative design for games and digital media.",
    },
    articles: {
      eyebrow: "Articles & Writing",
      title: "Articles",
      description: "A collection of recipes, technical articles, and personal stories.",
    },
    contact: {
      eyebrow: "Get in touch",
      title: "Contact",
      description: "Let's build something extraordinary together.",
    },
    resume: {
      eyebrow: "Career",
      title: "Resume",
      description: "Professional experience, skills, certifications, and background.",
    },
    subscribe: {
      eyebrow: "Preferences",
      title: "Subscribe",
      description: "Choose how you'd like to hear from MDCran and subscribe to updates.",
    },
    unsubscribe: {
      eyebrow: "Preferences",
      title: "Unsubscribe",
      description: "Enter your email address or phone number to unsubscribe from updates.",
    },
    minecraftMaps: {
      eyebrow: "Arts & Entertainment",
      title: "Minecraft Maps",
      description: "Custom-built Minecraft experiences for the world's biggest YouTubers.",
    },
    events: {
      eyebrow: "Arts & Entertainment",
      title: "Events",
      description: "Large-scale competitive and community Minecraft events.",
    },
    thumbnailDesign: {
      eyebrow: "Motion & Graphics",
      title: "Thumbnail Design",
      description: "Eye-catching thumbnails for gaming and entertainment content.",
    },
    videoEditing: {
      eyebrow: "Motion & Graphics",
      title: "Video Editing",
      description: "Fast, on-demand video editing for YouTube and social media.",
    },
    webDevDesign: {
      eyebrow: "Motion & Graphics",
      title: "Web Dev & Design",
      description: "Modern, premium web experiences for creators, companies and brands.",
    },
  },
  footer: {
    locationText: "Based in Orlando, FL.",
    statusLabel: "Open for work",
    emailHref: "/contact",
    githubHref: "https://github.com/mdcran",
    blurb: "Designing and building digital projects for creators, companies, and secure enterprise platforms.",
    linkGroups: [
      {
        title: "Arts & Entertainment",
        links: [
          { label: "Minecraft Maps", href: "/arts-and-entertainment/minecraft-maps" },
          { label: "Events", href: "/arts-and-entertainment/events" },
        ],
      },
      {
        title: "Motion & Graphics",
        links: [
          { label: "Thumbnail Design", href: "/motion-and-graphics/thumbnail-design" },
          { label: "Video Editing", href: "/motion-and-graphics/video-editing" },
          { label: "Web Dev & Design", href: "/motion-and-graphics/web-dev-design" },
        ],
      },
      {
        title: "Code & Articles",
        links: [
          { label: "Code", href: "/code" },
          { label: "Articles", href: "/articles" },
        ],
      },
      {
        title: "Other",
        links: [
          { label: "Contact", href: "/contact" },
          { label: "Resume", href: "/resume" },
        ],
      },
    ],
    bottomLinks: [
      { label: "Legal", href: "/legal" },
      { label: "Unsubscribe", href: "/unsubscribe" },
      { label: "Admin", href: "/admin" },
    ],
    copyrightText: "MDCran. All rights reserved.",
  },
  termsPage: {
    eyebrow: "Legal",
    title: "Terms of Service",
    lastUpdated: "March 1, 2026",
    sections: [
      {
        heading: "Acceptance of Terms",
        body:
          "By accessing and using mdcran.com, michaeldcran.com, or michaeldavidcran.com (collectively, the \"Site\"), you accept and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use the Site.",
      },
      {
        heading: "Use of the Site",
        body: "You agree to use the site only for lawful purposes. You must not:",
        bullets: [
          "Use the site in any way that violates applicable laws.",
          "Reproduce, duplicate, copy, or re-sell any part of the site without permission.",
          "Transmit unsolicited promotional or advertising material.",
          "Attempt to gain unauthorized access to any part of the site or related systems.",
          "Use the site to distribute malware or harmful code.",
        ],
      },
      {
        heading: "Services & Engagements",
        body:
          "Inquiries submitted via the contact form constitute expressions of interest only and do not create a binding contract. All service engagements are governed by a separate written agreement between MDCran and the client. By submitting the contact form or subscribe form, you consent to MDCran using the contact details you provide to respond to your inquiry and, where you have expressly opted in, to send future updates, newsletters, announcements, or related communications.",
      },
      {
        heading: "Contact",
        body: "These terms apply to all MDCran domains including mdcran.com, michaeldcran.com, and michaeldavidcran.com. If you have questions about these terms, contact contact@mdcran.com.",
      },
    ],
  },
  privacyPage: {
    eyebrow: "Legal",
    title: "Privacy Policy",
    lastUpdated: "March 1, 2026",
    sections: [
      {
        heading: "Information We Collect",
        body: "When you interact with MDCran through any of our domains (mdcran.com, michaeldcran.com, or michaeldavidcran.com), we may collect the following types of information:",
        bullets: [
          "Contact information when you submit the contact form, subscribe form, or newsletter signup.",
          "Usage data such as pages visited, time spent on pages, browser type, and device type via analytics tools.",
          "Communication data including messages you send and your communication preferences or consent selections.",
          "Technical data including IP address, browser type, and operating system.",
        ],
      },
      {
        heading: "How We Use Your Information",
        body: "We may use your information for the following purposes:",
        bullets: [
          "To respond to inquiries and fulfill project requests.",
          "To send service-related communications, updates, newsletters, and notifications you have consented to receive.",
          "To improve the website experience and understand how visitors interact with our content.",
          "To comply with legal obligations.",
        ],
      },
      {
        heading: "Data Retention",
        body:
          "We retain personal information only as long as necessary to fulfill the purposes for which it was collected, or as required by law. Contact and subscription records may be retained while needed to provide requested communications, maintain opt-in and opt-out preferences, or satisfy legal and operational requirements.",
      },
      {
        heading: "Contact",
        body: "This policy applies to all MDCran domains including mdcran.com, michaeldcran.com, and michaeldavidcran.com. For any privacy-related questions or requests, contact contact@mdcran.com.",
      },
    ],
  },
};
