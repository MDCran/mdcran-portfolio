export const ASSET_ROOT = "/slides/theanywherecompany/";

export type Slide = {
  id: string;
  title: string;
  chapter: string;
  seconds: number;
  notes: string[];
  sources?: { label: string; href: string }[];
};

const mapsSource = { label: "Minecraft projects", href: "https://www.mdcran.com/arts-and-entertainment/minecraft-maps" };
const pcSource = { label: "My PC build story", href: "https://www.mdcran.com/articles/building-my-own-computer" };
const homeSource = { label: "My smart-home story", href: "https://www.mdcran.com/articles/building-asmart-home" };

export const slides: Slide[] = [
  {
    id: "hello", title: "A little about me", chapter: "Hello", seconds: 30,
    notes: [
      "Hi, I’m Michael. I wanted to share a little of what I enjoy outside of work: games, building and tinkering, spending time with family and friends, and getting outside.",
      "A lot of my hobbies come back to the same thing: I see something interesting, wonder how it works, and want to try it myself. I’ll start with where that really took off for me: Minecraft on an iPad at a soccer field.",
    ],
  },
  {
    id: "soccer-field", title: "It started at a soccer field", chapter: "Growing up", seconds: 55,
    notes: [
      "My Minecraft story started with playing on iPads at a soccer field. It was a casual game at first, but I became interested in making things inside it, rather than only playing what was already there.",
      "The first two photographs are my supplied childhood soccer photos. The third image is the generated iPad-and-soccer-field illustration. Tell the memory in your own words: who you were playing with and what made you keep coming back.",
      "That freedom to take an idea and turn it into a place other people could explore is what stuck with me.",
    ], sources: [mapsSource],
  },
  {
    id: "miami-heat", title: "Big 3 dreams & Cranberry Crush", chapter: "Growing up", seconds: 65,
    notes: [
      "I grew up as a Miami Heat fan during the Big 3 era: LeBron James, Chris Bosh, and Dwyane Wade.",
      "When I was about 10 or 11, I tried to start my own NBA team called Cranberry Crush. I wanted a website to recruit players, so I tried to buy server space to get it online.",
      "My parents received a phone call about what I was trying to do, and I got in trouble. Tell that part of the story in your own words. It is a childhood plan, not a claim that the team was affiliated with the NBA.",
      "The photograph is me meeting Udonis Haslem. It was supplied with this story and is dated September 28, 2013 in the photo metadata. The age of the website attempt is intentionally approximate; the photo date is not presented as the date of that attempt.",
      "That same urge to make an idea real is what I kept exploring in Minecraft.",
    ],
  },
  {
    id: "minecraft", title: "A computer is only limited by its user", chapter: "Minecraft", seconds: 60,
    notes: [
      "A computer is only limited by its user. Minecraft made that idea feel tangible: a board game, a familiar game world, or a silly idea could become somewhere you could actually play with a friend.",
      "These are my Minecraft Board Game, Monopoly: PopularMMOs Edition, and Super Mario Hide & Seek. I helped build and design these experiences, including the places, rules, and little details that make them fun.",
      "Choose one favorite detail from one of these maps and tell the story behind it. For me, the best part is making something that puts a smile on someone’s face, and then getting to see people enjoy it.",
    ], sources: [mapsSource],
  },
  {
    id: "creators", title: "Some familiar faces", chapter: "Minecraft", seconds: 60,
    notes: [
      "That hobby led to making maps and creative content for a range of gaming creators and communities. PopularMMOs and GamingWithJen are the two I especially wanted to highlight here.",
      "Their projects included board games, simulators, and themed Minecraft experiences. Fourteen of the Minecraft maps currently listed on my site are linked to Pat and Jen.",
      "Choose the four groups of six creator and community logos by clicking 01, 02, 03, and 04. Each group appears with its stats first, then joins the blurred background after I move on. Unseen groups remain hidden, including groups skipped with the tabs. Click Pat & Jen to feature PopularMMOs and GamingWithJen at a larger scale. Replay clears the background and starts again. The tabs and group arrows always require a click, and this slide waits for me even if automatic playback is enabled elsewhere.",
      "The other logos are creators and communities listed in my portfolio. My role varied across maps, events, thumbnails, and other creative content.",
      "The subscriber figures are rounded public YouTube counts checked on November 3, 2026. Each number links to its source. The values are individual channel audiences, not a combined audience or a claim that I reached every subscriber. Entries without a verified subscriber count do not show a number.",
      "Share a favorite memory of making something for Pat and Jen, or of seeing a creator play a map for the first time.",
    ], sources: [mapsSource, { label: "PopularMMOs", href: "https://www.mdcran.com/clients/popularmmos" }, { label: "GamingWithJen", href: "https://www.mdcran.com/clients/gamingwithjen" }],
  },
  {
    id: "shared", title: "A hobby that reached a lot of people", chapter: "Making & sharing", seconds: 40,
    notes: [
      "It’s still a little surreal that something that began as a game on an iPad ended up being enjoyed by this many people.",
      "The portfolio snapshot has 73,679,726 combined project-video views, presented as 73.6M+, and 55 published projects. The visuals show examples: a Minecraft world, Snow Brawl 2021, creator artwork, my portfolio website, and a collage of every thumbnail from the linked Minecraft Projects playlist.",
      "The fifth image includes all 21 playlist thumbnails, each once, in playlist order, with the first video featured at a larger size. These are actual YouTube thumbnails. The playlist is one collection of Minecraft videos; the view total covers my wider public portfolio.",
      "The background graph adds up the same snapshot's video views across the 55 projects in portfolio order. Its horizontal axis represents projects, not dates; it is not a historical growth chart. The statistic remains the dated portfolio snapshot.",
      "The views are on videos featuring work in my wider portfolio, rather than just Minecraft maps. They are not subscribers or a personal audience claim. What I’m proud of is that something I helped make became part of someone else’s fun.",
      "That covers the things I’ve shared online. A place I always enjoy returning to in person is Chicago, where my family is.",
    ], sources: [mapsSource, { label: "Public project data · snapshot November 3, 2026", href: "https://www.mdcran.com/api/data/projects" }, { label: "Portfolio metrics", href: "https://www.mdcran.com/api/metrics" }, { label: "Minecraft Projects · full thumbnail playlist", href: "https://www.youtube.com/playlist?list=PLpTiCesNkwOXG1MidiHSKsXKAwTJ9e3vU" }],
  },
  {
    id: "chicago", title: "Back to Chicago. Back to family.", chapter: "Places", seconds: 55,
    notes: [
      "Chicago is where my family is, so it’s a place I love going back to. It’s a different pace and a different feeling from Florida.",
      "I enjoy the city itself too: the skyline, exploring, and finding good places to eat. These are some of my own photos from visits.",
      "Talk about a favorite family visit, a place you like to return to, or a meal you remember. Hilton Head Island is another place with childhood memories and a reason to return, which comes next.",
    ],
  },
  {
    id: "hilton-head", title: "Hilton Head Island: then and now", chapter: "Places", seconds: 40,
    notes: [
      "Hilton Head Island is a childhood favorite that I still enjoy returning to. Salty Dog, the island trails, and being able to ride a bike on the beach are all part of it.",
      "The background is an official Salty Dog Cafe photograph of its waterfront deck at South Beach Marina, sourced from the restaurant's website. It is a location image, not one of my personal photographs.",
      "My two supplied childhood photographs are part of this slide: one beside a deer while wearing a Salty Dog shirt, and one on the waterfront dock. They are childhood Hilton Head memories.",
    ], sources: [{ label: "Salty Dog Cafe · official background photograph", href: "https://saltydog.com/dine/cafe.html" }],
  },
  {
    id: "biking", title: "Favorite places to bike", chapter: "Outside", seconds: 50,
    notes: [
      "Biking is one of my favorite ways to get out and explore. Around Boca Raton, I like riding to the beach or over toward the airport.",
      "Around Orlando, I enjoy the West Orange Trail and Winter Garden Main Street.",
      "Hilton Head Island is another favorite: the trails, the scenery, and especially being able to ride on the sand. Biking on the beach feels completely different from riding on a road.",
      "I bike more than 1,000 miles a year and average about 25 miles a week, tracked through WHOOP, Strava, and my bike speedometer. These are my supplied personal figures. The bike-computer illustration shows weekly distance, rather than claiming a current speed or a live device reading.",
      "That love of getting outside is also part of why I enjoy flying drones, which comes next.",
    ],
  },
  {
    id: "drones", title: "A different point of view", chapter: "Outside", seconds: 55,
    notes: [
      "I own two drones, and flying them is a great mix of being outside and getting to play with technology.",
      "A place can look completely different once you see it from above. I like looking for patterns in the coastline, bridges, and water, and trying to frame a shot that shows something I wouldn’t notice from the ground.",
      "These are my own photos. Talk about a favorite flight, how you chose a shot, or the feeling of bringing back an image you’re really happy with.",
    ],
  },
  {
    id: "photo-album", title: "A few favorites from above", chapter: "Outside", seconds: 35,
    notes: [
      "Here are a few more favorites: the mangroves, a view over UCF, a boat towing a tube, boats passing through an inlet, and a building and its courtyard seen from above.",
      "The photographs advance only by click, with a slow optical dissolve and a subtle 20-second zoom-out on each image. Use the image arrows or selection bars to choose a photo. Leave a little space for people to look; this slide is a visual pause.",
    ],
  },
  {
    id: "cars", title: "A growing curiosity", chapter: "Weekends", seconds: 40,
    notes: [
      "My friends are really into tuning and modifying cars. I’m more casually interested, but going with them has gradually made me more curious.",
      "Car shows often overlap with the air shows I go to, so I’ve slowly gotten more into both. These are photos I took at car shows and meets.",
    ],
  },
  {
    id: "air-shows", title: "And sometimes, look up", chapter: "Weekends", seconds: 40,
    notes: [
      "Air shows are another thing I enjoy. Seeing the aircraft up close and then watching them fly together is hard to capture in a photo.",
      "These are my own clips and a photo of the Blue Angels. The videos are silent so I can talk over them. Share the part of the show that stood out to you.",
      "My favorite air-show performers are the Blue Angels, followed by the Thunderbirds. Press Next once to reveal the favorites tag on the middle photo; press it again to continue. Previous hides the tag so I can reveal it again.",
    ],
  },
  {
    id: "tech-events", title: "I like seeing what’s next", chapter: "Tinkering", seconds: 40,
    notes: [
      "I like going to tech events and seeing new technology in person. This is my photograph of a Tesla Optimus display.",
      "On my radar: CES in Las Vegas, GitHub Universe, Apple WWDC and OpenAI DevDay. These are dream events I’d love to attend one day.",
      "That curiosity also shows up in my hobbies: collecting old technology and building new technology myself.",
    ],
  },
  {
    id: "collection", title: "Collecting old, building new", chapter: "Tinkering", seconds: 40,
    notes: [
      "I also enjoy collecting older technology. Game Boys, iPods, cameras, and older phones each have their own little design decisions and memories attached to them.",
      "I like having something physical to explore: the buttons, the menus, and the way a device feels to use. It’s interesting to see how much changed, and what still feels good years later.",
      "Collecting older devices is one side of the hobby; building new technology is the other. That leads into my custom computer on the next slide.",
    ],
  },
  {
    id: "pc", title: "The computer I built myself", chapter: "Tinkering", seconds: 60,
    notes: [
      "I built my first computer around 2018 with money I made from Minecraft projects. I started with very little hardware knowledge and learned as I went.",
      "The newer build became a much bigger personal project: about $6,000, with an overclocked setup and a custom water-cooling loop. It has hardline tubing, water blocks, a pump, reservoirs, and a lot of fans.",
      "The enjoyable part is that it’s mine from the inside out. I chose the parts, worked out the layout, and put it together. This collage shows only my current build, with my photographs and several silent video loops from different angles.",
      "The close-up photographs and videos are part of this same collage: hardline tube routes, graphics-card water blocks, fittings, and lighting. Tell one real moment from planning the loop or the first time you switched it on.",
      "From building my computer, the next step is making everything at home smart. The same interest in putting things together carries into my smart-home projects.",
    ], sources: [pcSource],
  },
  {
    id: "smart-home", title: "Making everything smart", chapter: "Tinkering", seconds: 75,
    notes: [
      "That same interest in tinkering extends to making everything smart at home. Home Assistant runs on a Raspberry Pi and brings devices like lights, sensors, and cameras together.",
      "I use Ubiquiti networking and divide the network into five sections so smart gadgets, guest devices, and personal devices don’t all have free access to one another. The simple idea is that a problem with a smart gadget should stay separate from my personal devices.",
      "A Raspberry Pi keeps the home services running. Home Assistant handles the automations, Ubiquiti provides the network, and Pi-hole filters DNS. Immich is my photo library, and Nextcloud gives me files and sync in my own home setup. Tailscale connects me back securely, and UNAS provides storage.",
      "The stack strip keeps Home Assistant, Ubiquiti, Pi-hole, Immich, Nextcloud, and Raspberry Pi visible throughout the slide. The technical explanation on the left updates with the selected panel. The first five images are from my smart-home article; the Immich photo-library panel uses my own photographs, and the Nextcloud panel is a service diagram rather than a screenshot of the app.",
      "Click the gallery tabs or arrows to choose each system. These panels and this slide always wait for a click, including when automatic playback is enabled elsewhere.",
      "Choose one automation you actually use and describe the little everyday moment it makes better. Once the devices worked together, I started thinking about how the interface could feel more personal.",
    ], sources: [homeSource],
  },
  {
    id: "room-idea", title: "Creating a better Interface", chapter: "Tinkering", seconds: 75,
    notes: [
      "An idea I’m exploring is an iOS app that uses the phone’s cameras and LiDAR to scan a room and create a 3D model.",
      "Then I want to use AI to create a Home Assistant interface that is unique to that room. Instead of starting from a generic list of devices, the controls could feel connected to the space you’re actually in.",
      "This is part of tinkering with Apple development: experimenting with iPhone LiDAR, iOS apps, and TestFlight while looking for ways to make my smart home better. The Apple logo identifies the development ecosystem I’m exploring.",
      "The room view is my supplied 3D interface prototype. It shows a demo apartment and example devices, rather than a scan of my own home or a completed LiDAR-to-dashboard product. The scanning workflow is the direction I’m exploring.",
      "The supplied room image stays on screen throughout this slide, showing the idea beside the iPhone and LiDAR workflow.",
      "AI-assisted development, iOS apps, and TestFlight are all part of refining the same personal project. Share what you have learned from building, testing, and improving the interface, then move on to making physical objects.",
    ], sources: [homeSource],
  },
  {
    id: "making", title: "Making things I can hold", chapter: "Tinkering", seconds: 55,
    notes: [
      "I’ve also been engraving metal cards. This is one of mine. I like the step of turning a design on a screen into a real object.",
      "This slide always waits for a click, even if automatic playback is enabled elsewhere. Press Next once: the laser-engraver background dissolves into a 3D printer while my engraved card changes into an airport-style split-flap board. Previous returns to the card and engraver. The workshop images and board are generated concepts; the engraved card is my actual photograph and work.",
      "Laser engraving puts the detail onto metal; 3D printing turns the design into a body I can hold. Press Next again to carry the board visual into its own slide and explain how those tools come together in my next side project.",
    ],
  },
  {
    id: "split-flap", title: "My next side project: a split-flap board", chapter: "Tinkering", seconds: 55,
    notes: [
      "My next side project is a split-flap board, inspired by the mechanical departures displays in airports. Rows of individual character modules flip through letters and numbers to show destinations, times, or other messages.",
      "I want to laser-engrave the metal cards for the flaps and 3D-print the body and module supports. Stepper motors would move each digit, while magnets and Hall-effect sensors would establish the home position. An Arduino would coordinate the movement.",
      "This is a planned project, not a finished build. The generated image shows a realistic airport-style tabletop board with destinations from this presentation: Chicago, Orlando, and Hilton Head. The enclosure and mechanism are still to be worked out.",
    ],
  },
  {
    id: "weekend", title: "My kind of weekend", chapter: "Everyday life", seconds: 65,
    notes: [
      "A good weekend might include cooking or baking, flying my drone, getting out in nature, a bike ride, throwing a frisbee, or playing soccer or pickleball with friends.",
      "The collage slowly expands each moment in turn: my cheesecake, one of my drone photographs, nature, a coastal ride, and a game with friends. The cooking, drone, and nature photographs are mine. The bicycle and sports-equipment scenes are generated illustrations, rather than photographs of a particular outing.",
      "The collage advances only by click. Select an image panel, selection bar or arrow to smoothly expand a moment and hold it while talking. This slide also waits for a click before moving on.",
      "Share how you’d spend an ideal free afternoon. This is a chance to bring the talk back to everyday life and the people you enjoy spending time with.",
    ],
  },
  {
    id: "thanks", title: "AI in my everyday life", chapter: "Everyday AI", seconds: 45,
    notes: [
      "I’ve been working AI into my everyday life to stay organized, automate repetitive tasks, and keep learning how to use it.",
      "This deck’s creator-supplied model credits are GPT 6.1 Sol from OpenAI and Claude Opus 5.5 from Anthropic. The tool strip shows Anthropic, OpenAI, Gemini, Higgsfield AI, ElevenLabs, Twilio, and n8n.",
      "The model names are the presentation credits supplied by Michael. These are the tools I’ve been exploring and bringing into everyday life.",
    ],
  },
  {
    id: "after-dark", title: "My brain never clocks out", chapter: "After hours", seconds: 90,
    notes: [
      "The supplied robot-at-reception video loops silently behind every reveal. The accelerated clock starts at 9 AM and keeps spinning past 5 PM, through the night and into the next day. The digital readout stays in sync, and the animation pauses with the presentation or while the tab is hidden.",
      "I live and breathe technology. At home I keep making systems smarter; side projects turn ideas into real things; in business I want to contribute work that matters. It is a constant pull to create something great and find the next way to improve it.",
      "Press Next to reveal my creator-supplied usage total: more than 73.7 billion AI tokens. I subscribe to the highest AI tiers and still hit their limits. This is my personal usage claim, separate from the portfolio’s video-view statistic; it is not a live usage feed or a measured time-series graph.",
      "The clock gives way to n8n. Connectors, MCPs, and automation are ways I bring the tools together. Press Next again to unfold the workflow; Back reverses the reveals. The same reveals can follow their timings when automatic slide advancement is enabled in settings.",
      "The diagram depicts the workflow I’m describing: connected channels carry bug fixes and change requests, OpenAI and Anthropic help with the work, and n8n connects the process to GitHub, GitHub Actions, Vercel, Railway, Resend, Supabase, and Twilio. The service nodes link to their official sites. GitHub issues and revisions feed back into the AI-powered step for fixes and changes. Twilio also returns to the AI-powered stage for conversational AI, with moving light along the wires showing the flow.",
      "Provisioning accounts and services, creating websites, deploying changes, and automating fixes are organized per project and per client. Talk through one example of a request moving through the connected tools and returning to the right project channel.",
    ],
  },
  {
    id: "thank-you", title: "Thank you", chapter: "Thank you", seconds: 20,
    notes: [
      "It was a pleasure meeting and speaking with you all. Thank you for your time.",
      "The closing slide uses Michael’s supplied signature and The Anywhere Company logo. Leave this slide on screen to end the presentation.",
    ],
  },
];

export const creators = [
  ["popularmmos", "PopularMMOs"], ["gamingwithjen", "GamingWithJen"],
  ["lubcubs", "LubCubs"], ["beckjack", "BeckBroJack"], ["jelly", "Jelly"],
  ["crainer", "Crainer"], ["slogo", "Slogo"], ["ssundee", "SSundee"],
  ["tommyinnit", "TommyInnit"], ["unspeakable", "Unspeakable"], ["moosecraft", "Moose"],
  ["shark", "Shark"], ["stroie", "Stroie"], ["theagaming", "TheaGaming"],
  ["ccrizzic", "CCrizzic"], ["doctorbenx", "DoctorBenx"], ["epicstun", "EpicStun"],
  ["lynixity", "Lynixity"], ["gav1n", "Gav1n"], ["nico", "Nico"], ["cash", "Cash"],
  ["bendie", "Bendie"], ["100media", "100 Media"], ["plixel", "Plixel"],
  ["pokefind", "PokeFind"], ["tubnet", "TubNet"],
] as const;

export function slideIndexFromHash(hash: string) {
  const requested = hash.replace(/^#/, "");
  const id = requested === "pc-process" ? "pc" : requested === "ios-lab" ? "room-idea" : requested;
  const index = slides.findIndex((slide) => slide.id === id);
  return index >= 0 ? index : 0;
}

export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
