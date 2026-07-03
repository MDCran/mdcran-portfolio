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
      { key: "totalProjectViews", label: "Project Views", description: "Total views on embedded content" },
      { key: "githubContributions", label: "GitHub Contributions", description: "Since Jan 2024" },
      { key: "totalProjects", label: "Public Projects", description: "Maps, designs, events & more" },
      { key: "yearsActive", label: "Creating", description: "Continuously since 2018" },
    ],
  },
  aiUsageTracker: {
    lastUpdated: "2026-07-02",
    claude: {
      totalTokens: 146_400_000,
      totalMessages: 120_846,
      peakHour: "1 AM",
      favoriteModel: "Opus 4.8",
      models: [
        { name: "Opus 4.8", percent: 75.7, inputTokens: 28_100_000, outputTokens: 82_600_000 },
        { name: "Sonnet 4.6", percent: 13.6, outputTokens: 19_800_000 },
        { name: "Opus 4.7", percent: 6.2 },
        { name: "Fable 5", percent: 3.4 },
        { name: "Haiku 4.5", percent: 1.1 },
      ],
    },
    openai: {
      totalTokens: 307_000_000,
      totalRequests: 2_368,
    },
    elevenlabs: {
      charactersUsed: 0,
    },
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
    lastUpdated: "June 19, 2026",
    sections: [
      {
        heading: "Acceptance of Terms",
        body: "By accessing or using mdcran.com, michaeldcran.com, or michaeldavidcran.com (collectively, the \"Site\") in any way — including simply browsing — you confirm that you have read, understood, and agree to be bound by these Terms of Service, the Privacy Policy, and the Cookies, Tracking & AI disclosures set out on this page. Continued use of the Site after any update to these terms constitutes acceptance of the revised terms. If you do not agree, please do not use the Site.",
      },
      {
        heading: "Analytics, Tracking & Data Collection",
        body: "By using this Site you acknowledge and agree that the following data collection and processing occurs as described in the Privacy Policy and Cookies disclosures above:",
        bullets: [
          "Essential session cookies and local storage identifiers are set automatically to operate the site. These cannot be disabled while using the site.",
          "If you select 'Accept All' on the cookie banner, or continue to use the site without choosing 'Essential Only', you consent to optional analytics including page-view tracking, scroll-depth recording, click/scroll heatmaps, and behavioural event logging.",
          "Your IP address is collected on every server request and used for geolocation, rate-limiting, and abuse prevention.",
          "A deterministic device fingerprint (derived from browser-exposed characteristics) may be computed and stored to power optional device recognition and personalisation features.",
          "If you voluntarily enter your name in the Accessibility panel, or if the AI assistant extracts it from conversation and you confirm it, that name is associated with your device fingerprint and stored in a private database visible to the site owner.",
          "Submitted contact forms, meeting bookings, and newsletter subscriptions are stored in a private CRM database and trigger real-time notifications to the site owner's private Discord server containing the submitted details and session metadata.",
        ],
      },
      {
        heading: "Use of the Site",
        body: "You agree to use the site only for lawful purposes and in a manner that does not infringe the rights of, restrict, or inhibit anyone else's use and enjoyment of the site. You must not:",
        bullets: [
          "Use the site in any way that violates applicable local, national, or international laws or regulations.",
          "Reproduce, duplicate, copy, scrape, or re-sell any part of the site without express written permission.",
          "Transmit unsolicited promotional or advertising material ('spam').",
          "Attempt to gain unauthorised access to any part of the site, its servers, or related systems.",
          "Use the site to distribute malware, harmful code, or phishing material.",
          "Circumvent, disable, or interfere with any security-related features of the site, including rate-limiting, bot detection, or access controls.",
          "Use automated tools (bots, scrapers, crawlers) on the site in a manner that places unreasonable load on infrastructure or circumvents intended use flows.",
        ],
      },
      {
        heading: "Services & Engagements",
        body: "Inquiries submitted via the contact form constitute expressions of interest only and do not create a binding contract. All service engagements are governed by a separate written agreement between MDCran and the client. By submitting the contact form or subscribe form, you consent to MDCran using the contact details you provide to respond to your inquiry and, where you have expressly opted in, to send future updates, newsletters, announcements, or related communications. You may unsubscribe at any time.",
      },
      {
        heading: "Bookings & Meetings",
        body: "Booking a meeting via the Site's calendar constitutes a confirmed appointment request. By completing a booking you consent to the site owner using the contact information and details you provide (name, email, phone, purpose, and notes) to communicate about and fulfil the meeting. Booking details are stored in our private database and trigger a notification to the site owner. The site owner may cancel or reschedule appointments; in such cases you will be notified via the email you provided.",
      },
      {
        heading: "AI Assistant Disclaimer",
        body: "The AI assistant on this Site is provided for informational and convenience purposes only. Responses are generated by a third-party language model and may be inaccurate, incomplete, or outdated. Nothing the AI assistant says constitutes professional, legal, financial, medical, or employment advice. Always verify important information from authoritative sources. By interacting with the AI assistant you acknowledge these limitations and agree not to rely on it for critical decisions.",
      },
      {
        heading: "Intellectual Property",
        body: "All content on this Site — including text, images, videos, code, and design — is the property of Michael D. Cran or used with permission, and is protected by applicable copyright, trademark, and intellectual property laws. Nothing on this Site grants you a licence to reproduce, distribute, or create derivative works from any content without explicit written permission.",
      },
      {
        heading: "Limitation of Liability",
        body: "To the fullest extent permitted by law, MDCran shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use this Site, its content, or its features — including but not limited to damages resulting from errors, omissions, interruptions, delays, or inaccuracies in content, AI responses, or data. Your sole remedy for dissatisfaction with the Site is to discontinue use.",
      },
      {
        heading: "Governing Law",
        body: "These terms are governed by and construed in accordance with the laws of the State of Florida, United States, without regard to its conflict-of-law provisions. Any dispute arising under these terms shall be subject to the exclusive jurisdiction of the courts located in Florida, unless mandatory consumer protection laws in your jurisdiction require otherwise.",
      },
      {
        heading: "Changes to These Terms",
        body: "We may update these Terms of Service at any time. Updated terms will be posted on this page with a revised 'last updated' date. Your continued use of the Site after any change constitutes acceptance of the new terms. If you disagree with the changes, your remedy is to stop using the Site.",
      },
      {
        heading: "Contact",
        body: "These terms apply to all MDCran domains including mdcran.com, michaeldcran.com, and michaeldavidcran.com. For questions about these terms, contact contact@mdcran.com.",
      },
    ],
  },
  privacyPage: {
    eyebrow: "Legal",
    title: "Privacy Policy",
    lastUpdated: "June 19, 2026",
    sections: [
      {
        heading: "Who We Are & Scope",
        body: "This Privacy Policy applies to mdcran.com, michaeldcran.com, and michaeldavidcran.com (collectively, the \"Site\"), operated by Michael D. Cran, a freelance software engineer and developer based in Florida, USA. This policy explains what personal data we collect, why we collect it, how we use it, and your rights over it. It supplements the detailed Cookies, Tracking & AI disclosures above.",
      },
      {
        heading: "Data We Collect & Why",
        body: "We collect the following categories of personal data:",
        bullets: [
          "Identity & contact data — name, email address, and/or phone number you provide when submitting the contact form, booking a meeting, subscribing to the newsletter, or entering your name in the accessibility/identity panel.",
          "Message & communication data — the content of messages you send via the contact form, notes on bookings, and interactions with the AI chat assistant.",
          "Technical & analytics data — IP address, browser name and version, operating system, device type, screen resolution, timezone, language, GPU renderer identifier, referring URL, pages visited, time on page, scroll depth, and click/scroll heatmap co-ordinates.",
          "Device fingerprint & identity record — a hash of browser-exposed characteristics used to recognise your device across visits, optionally associated with a name you provide or the AI extracts from conversation.",
          "Booking data — selected meeting type, date, time, duration, and any purpose or notes you provide.",
          "Consent & preference data — your cookie consent choice, language preference, and accessibility settings.",
        ],
      },
      {
        heading: "How We Use Your Data",
        body: "We use your personal data for the following purposes:",
        bullets: [
          "To operate and maintain the Site, including serving pages, enforcing rate limits, and preventing abuse.",
          "To respond to contact form inquiries, confirm and manage meeting bookings, and send communications you have consented to receive.",
          "To manage newsletter subscriptions and send updates you have opted in to receive.",
          "To power the optional personal identity / device-recognition feature so we can greet you by name on return visits.",
          "To analyse how the Site is used (page views, scroll depth, engagement events, heatmaps) to improve it.",
          "To operate the AI assistant, including passing conversation context to third-party AI providers.",
          "To send the site owner real-time CRM notifications (via a private Discord server) when you submit a form, book a meeting, subscribe, unsubscribe, or create an identity record — containing the data you submitted plus session metadata.",
          "To generate aggregated, de-identified analytics reports (including a weekly automated digest sent to the site owner).",
          "To comply with legal obligations and protect the Site from fraud, abuse, and unauthorised access.",
        ],
      },
      {
        heading: "Data Retention",
        body: "We retain personal data only as long as necessary for the purposes above. Raw IP addresses are hashed or discarded shortly after collection. Analytics session and event data may be cleared periodically. Contact, booking, and subscription records are retained while relevant to the correspondence or subscription and deleted on request or on a routine schedule. Identity / device records persist until you detach your device or request deletion. Database backups are rotated and overwritten over time.",
      },
      {
        heading: "Your Rights",
        body: "You have the right to access, correct, delete, or restrict our use of your personal data. You can withdraw consent to analytics at any time using the opt-out control on the legal page. To exercise any other right, email contact@mdcran.com with the subject 'Privacy Request' and we will respond within the timeframe required by applicable law.",
      },
      {
        heading: "Contact",
        body: "For privacy questions or requests, contact contact@mdcran.com. If you are in the EU/UK you may also complain to your local Data Protection Authority.",
      },
    ],
  },
  barEnabled: false,
  barCategories: [
    {
      id: "staples",
      name: "The Staples",
      color: "#0ea5e9",
      description: "The bread-and-butter pours every bar has on hand. Never a wrong answer.",
      options: ["Beer / House Lager", "Vodka Soda", "Rum & Coke", "Whiskey & Coke", "Jack & Coke", "Vodka Cranberry", "House Red Wine", "House White Wine"],
    },
    {
      id: "classics",
      name: "The Classics",
      color: "#22c55e",
      description: "Safe, crowd-pleasing options. Perfect if you just met someone and want a normal, high-quality drink order.",
      options: ["Espresso Martini", "Spicy Margarita", "Gin & Tonic", "Old Fashioned", "Moscow Mule", "Long Island Iced Tea"],
    },
    {
      id: "wild-cards",
      name: "The Wild Cards",
      color: "#f59e0b",
      description: "Instantly elevates the energy of the night. It locks in a decision so nobody can back out.",
      options: ["Bartender's Choice", "Lemon Drop Shot", "Tequila Shot", "Fireball Shot", "Jägerbomb"],
    },
    {
      id: "chaotic-fails",
      name: "The Chaotic Fails",
      color: "#ef4242",
      description: "The risk factor. Having one or two genuinely funny/bad options on the wheel makes spinning it actually thrilling.",
      options: ["Warm Well Tequila", "Malört (or a local terrible shot)", "A cup of straight pickle juice", "Wells Vodka, neat"],
    },
    {
      id: "stay-hydrated",
      name: "The Stay Hydrated",
      color: "#38bdf8",
      description: "A hilarious mood-killer option that is actually incredibly useful if it's getting late and someone needs a break.",
      options: ["Water", "Red Bull / Energy Drink", "Club Soda with Lime", "Coke / Soda"],
    },
    {
      id: "naughty-shots",
      name: "Naughty Shots",
      color: "#ec4899",
      description: "The ones that make you do a double-take when you order them. Every bar can make these — they just might blush.",
      options: ["Wet Pussy", "Blow Job", "Buttery Nipple", "Slippery Nipple", "Sex on the Beach (shot)"],
      recipes: {
        "Wet Pussy": "Fill a shot glass with equal parts peach schnapps and Bailey's Irish Cream. Pour the Bailey's slowly over the back of a spoon to create a float on top. No mixing — layered beauty.",
        "Blow Job": "Layer equal parts Bailey's and Kahlúa in a shot glass. Top generously with whipped cream. The catch: drink it hands-free, no touching the glass.",
        "Buttery Nipple": "Combine ¾ oz butterscotch schnapps and ¾ oz Bailey's in a shaker with ice. Strain into a shot glass. Creamy, sweet, zero shame.",
        "Slippery Nipple": "Layer ¾ oz Sambuca in the bottom of a shot glass, then slowly pour ¾ oz Bailey's on top using the back of a spoon. Silky smooth.",
        "Sex on the Beach (shot)": "Equal parts vodka, peach schnapps, cranberry juice, and OJ (½ oz each). Shake with ice, strain into a shot glass. Fruity and sneaky strong.",
      },
    },
    {
      id: "bar-bets",
      name: "Bar Bets",
      color: "#84cc16",
      description: "Weird, funny, or wildly specific drinks that any bar can make. Perfect for a bet, a dare, or just pure chaos.",
      options: ["Pickle Back", "Boilermaker", "The Red Snapper", "Death in the Afternoon", "Shirley Temple (non-alcoholic)"],
      recipes: {
        "Pickle Back": "Order a shot of whiskey — preferably Jameson. Chase it immediately with a shot of pickle brine straight from the jar. Sounds wrong, tastes weirdly right.",
        "Boilermaker": "Drop a shot glass of whiskey directly into a pint of lager or pilsner. Drink it as fast as you can before it foams over. Classic dive bar move.",
        "The Red Snapper": "2 oz whiskey, ½ oz amaretto, splash of Coke — served on the rocks. Tastes like a Cherry Coke that went to college.",
        "Death in the Afternoon": "Pour 1½ oz absinthe into a champagne flute. Slowly pour chilled champagne on top until the drink turns a cloudy, pale yellow. Named by Hemingway. No notes.",
        "Shirley Temple (non-alcoholic)": "Fill a glass with ice, pour in ginger ale and a splash of OJ, add a generous pour of grenadine. Stir gently, garnish with a maraschino cherry. Perfect if you're the designated driver, or just smart.",
      },
    },
  ],
};
