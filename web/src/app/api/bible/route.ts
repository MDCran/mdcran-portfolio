import { NextResponse } from "next/server";

// We use the ESV Bible API (api.esv.org) if a key is provided,
// otherwise fall back to the API.Bible free endpoint or static verse pool.
const ESV_API_KEY = process.env.ESV_API_KEY;

// Curated verse pool for rotation when no API key is set
const VERSE_POOL = [
  { reference: "Philippians 4:13", text: "I can do all things through him who strengthens me." },
  { reference: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the LORD, plans for welfare and not for evil, to give you a future and a hope." },
  { reference: "Romans 8:28", text: "And we know that for those who love God all things work together for good, for those who are called according to his purpose." },
  { reference: "Proverbs 3:5-6", text: "Trust in the LORD with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make straight your paths." },
  { reference: "Isaiah 40:31", text: "But they who wait for the LORD shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint." },
  { reference: "Psalm 23:1", text: "The LORD is my shepherd; I shall not want." },
  { reference: "John 3:16", text: "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life." },
  { reference: "Matthew 6:33", text: "But seek first the kingdom of God and his righteousness, and all these things will be added to you." },
  { reference: "Psalm 46:10", text: "Be still, and know that I am God. I will be exalted among the nations, I will be exalted in the earth!" },
  { reference: "Galatians 5:22-23", text: "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, self-control; against such things there is no law." },
  { reference: "2 Timothy 1:7", text: "For God gave us a spirit not of fear but of power and love and self-control." },
  { reference: "Romans 12:2", text: "Do not be conformed to this world, but be transformed by the renewal of your mind." },
  { reference: "Psalm 37:4", text: "Delight yourself in the LORD, and he will give you the desires of your heart." },
  { reference: "Ephesians 2:8-9", text: "For by grace you have been saved through faith. And this is not your own doing; it is the gift of God, not a result of works, so that no one may boast." },
];

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export async function GET() {
  // Try ESV API if key available
  if (ESV_API_KEY) {
    try {
      const dayOfYear = getDayOfYear();
      const VERSE_LIST = [
        "John 3:16", "Philippians 4:13", "Jeremiah 29:11", "Romans 8:28",
        "Proverbs 3:5-6", "Isaiah 40:31", "Psalm 23:1", "Matthew 6:33",
      ];
      const passage = VERSE_LIST[dayOfYear % VERSE_LIST.length];
      const url = `https://api.esv.org/v3/passage/text/?q=${encodeURIComponent(passage)}&include-headings=false&include-footnotes=false&include-verse-numbers=false&include-short-copyright=false&include-passage-references=false`;
      const res = await fetch(url, {
        headers: { Authorization: `Token ${ESV_API_KEY}` },
        next: { revalidate: 86400 },
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.passages?.[0]?.trim();
        if (text) {
          return NextResponse.json({
            reference: passage,
            text,
            translation: "ESV",
          });
        }
      }
    } catch {
      // fall through to pool
    }
  }

  // Rotate from pool — random if ?r=1 param present, else day-based
  const day = getDayOfYear();
  const verse = VERSE_POOL[day % VERSE_POOL.length];
  return NextResponse.json({ ...verse, translation: "ESV" });
}

export async function POST() {
  // Called by refresh button — returns a random verse from the pool
  const idx = Math.floor(Math.random() * VERSE_POOL.length);
  return NextResponse.json({ ...VERSE_POOL[idx], translation: "ESV" });
}
