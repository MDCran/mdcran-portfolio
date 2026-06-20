/**
 * All tour narration texts in playback order.
 * Shared between AssistantTutorial (client) and /api/voice/tour-pregen (server).
 * Keep in sync with the STEPS flow in AssistantTutorial.tsx.
 */
export const TOUR_TEXTS = [
  // 0: intro
  "Hey — I'm Michael, your AI assistant, here to walk you through my portfolio. Let me give you the quick tour.",
  // 1: about
  "First up, this is where you can get to know me — a quick intro to who I am and what I do.",
  // 2: featured projects
  "These are some of my most renowned projects, the work I'm honestly proudest of.",
  // 3: clients
  "And here are the clients and creators I've gotten to work with over the years.",
  // 4: site tree
  "I can take you to any page on the site — just ask. Here's the full picture at a glance.",
  // 5: nav → resume
  "And if you're a recruiter or just want the full breakdown — my resume is right up here. Let me take you there.",
  // 6: resume — download
  "Right here you can download my ATS-optimized resume — I built it in LaTeX, so it's clean, structured, and ready for any screener.",
  // 7: resume — work experience
  "Here's my work experience — every role and company that's shaped where I am today.",
  // 8: resume — skills
  "Technical and creative skills, all organized right here.",
  // 9: resume — volunteer
  "Volunteer work and activities I've contributed to.",
  // 10: resume — organizations
  "And here are all the clubs and groups I've been part of.",
  // 11: resume — featured → army reserve
  "Right here's my featured work. Army Reserve Mercury is up front — come on, I'll take you there.",
  // 12: army reserve — overview
  "This is Army Reserve Mercury — a platform our UCF team built for the U.S. Army Reserve to modernize their administrative workflows from the ground up.",
  // 13: army reserve — pitch & prototype
  "Basically I walked into a meeting and laid the whole redesign out for everyone. We put together the first prototypes and design directions from scratch — real working mockups — all before the build had even started.",
  // 14: army reserve — tech stack
  "The new design used React Native Reusables, Moti, and Lottie animations to give soldiers a faster, cleaner, and more intuitive daily experience on the platform.",
  // 15: army reserve — docs
  "Once we shipped, I put together docs so the team had everything they needed to keep building and maintaining it from there.",
  // 16: return
  "And that's the tour! Honestly, I could talk about this stuff all day — so don't hold back. Ask me anything. I'm all yours.",
];
