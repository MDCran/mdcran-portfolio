import { TERMINAL_THEMES } from "./terminal-theme";

export const COMMAND_GROUPS = [
  { id: "explore", title: "Explore the portfolio", description: "Projects, articles, clients, search, and navigation" },
  { id: "recruiting", title: "Resume & recruiting", description: "Experience, skills, downloads, and role fit" },
  { id: "assistant", title: "AI & tour", description: "Ask questions or take a guided walkthrough" },
  { id: "settings", title: "Sound & appearance", description: "Themes, music, typing clicks, background, pets, and window size" },
  { id: "forms", title: "Contact & updates", description: "Create a draft, edit it, then send or cancel" },
  { id: "extras", title: "Games & extras", description: "Games, Spotify, the browser, and visitor stats" },
  { id: "terminal", title: "Terminal controls", description: "Help, clear, reload, and exit" },
] as const;

type Command = {
  name: string; group: typeof COMMAND_GROUPS[number]["id"]; usage: string;
  description: string; example?: string; aliases?: string[]; options?: string[];
};
const toggleOptions = ["on", "off", "status"];
const resumeOptions = ["all", "summary", "experience", "education", "skills", "certifications", "awards", "download", "pdf", "print"];

// Help, command discovery, aliases, and option completion share one reference.
export const TERMINAL_COMMANDS: readonly Command[] = [
  { name:"about", group:"explore", usage:"about", description:"Read Michael’s portfolio introduction." },
  { name:"projects", group:"explore", usage:"projects", description:"List all projects." },
  { name:"featured", group:"explore", usage:"featured", description:"List featured portfolio work." },
  { name:"articles", group:"explore", usage:"articles", description:"List articles." },
  { name:"clients", group:"explore", usage:"clients", description:"List clients and their profiles." },
  { name:"search", group:"explore", usage:"search <query>", description:"Search projects, articles, clients, and pages. Type a result number to open it.", example:"search React" },
  { name:"open", group:"explore", usage:"open <slug or name>", aliases:["nano"], description:"Open a project, article, client, or page in the terminal.", example:"open coretex" },
  { name:"select", group:"explore", usage:"select <number>", description:"Open a search result. Typing its number also works.", example:"select 1" },
  { name:"ls", group:"explore", usage:"ls", description:"List the contents of the current directory." },
  { name:"cd", group:"explore", usage:"cd <path>", description:"Change directory. Use .. to go up or / to return to the root.", example:"cd engineering" },
  { name:"pwd", group:"explore", usage:"pwd", description:"Show the current directory path." },
  { name:"home", group:"explore", usage:"home", description:"Return to the root directory." },
  { name:"resume", group:"recruiting", usage:"resume [section]", options:resumeOptions, description:"Read the full resume or one section. Download, pdf, and print show resume links.", example:"resume experience" },
  { name:"recruiter", group:"recruiting", usage:"recruiter [summary|projects|skills|fit|resume|contact] [query]", options:["summary","projects","skills","fit","resume","contact"], description:"Explore published evidence or compare a role with Michael’s work.", example:"recruiter projects TypeScript" },
  { name:"skills", group:"recruiting", usage:"skills [technology]", description:"Read skills or find projects demonstrating a technology.", example:"skills React" },
  { name:"experience", group:"recruiting", usage:"experience", description:"Read the work experience section." },
  { name:"education", group:"recruiting", usage:"education", description:"Read the education section." },
  { name:"mode", group:"assistant", usage:"mode <shell|ai>", options:["shell","ai"], description:"Switch between Shell commands and natural-language AI chat.", example:"mode ai" },
  { name:"ask", group:"assistant", usage:"ask <question>", description:"Ask Michael’s AI portfolio guide. With no question, enter AI chat. Follow-up questions keep context.", example:"ask What AI projects has Michael built?" },
  { name:"ai", group:"assistant", usage:"ai [question|on|off|clear|stop]", options:["on","off","clear","stop"], description:"Enter AI chat, ask a question, reset the conversation, or stop a response.", example:"ai clear" },
  { name:"agent", group:"assistant", usage:"agent <request>", description:"Ask the AI to open portfolio content or show resume evidence.", example:"agent show my resume" },
  { name:"stop", group:"assistant", usage:"stop", description:"Stop the current AI response. Ctrl+C also works." },
  { name:"tour", group:"assistant", usage:"tour [start|next|back|try|1-5|stop]", options:["start","next","back","try","1","2","3","4","5","stop"], description:"Start the walkthrough, try a step, or move between steps.", example:"tour" },
  { name:"next", group:"assistant", usage:"next", description:"Move to the next tour step." },
  { name:"back", group:"assistant", usage:"back", description:"Move to the previous tour step." },
  { name:"togglemusic", group:"settings", usage:"togglemusic [on|off|status]", options:toggleOptions, description:"Toggle the soundtrack. on/off sets it explicitly; status reads it without changing it.", example:"togglemusic off" },
  { name:"togglekeystrokeclicks", group:"settings", usage:"togglekeystrokeclicks [on|off|status]", options:toggleOptions, description:"Toggle typing and text-reveal clicks. on/off sets them; status reads the setting.", example:"togglekeystrokeclicks status" },
  { name:"togglebackground", group:"settings", usage:"togglebackground [on|off|status]", options:toggleOptions, description:"Toggle the retro background. on/off sets it; status reads the setting.", example:"togglebackground on" },
  { name:"theme", group:"settings", usage:"theme [hacker|dark|cyberpunk|grayscale|light|high-contrast|list|status|reset]", options:[...TERMINAL_THEMES,"list","status","reset"], description:"Choose a site theme for the terminal. With no option, list the choices. Your choice is saved on this device; reset restores Hacker.", example:"theme cyberpunk" },
  { name:"pet", group:"settings", usage:"pet <cat|bot|crab|off>", options:["cat","bot","crab","off"], description:"Choose a terminal companion or hide it.", example:"pet crab" },
  { name:"animations", group:"settings", usage:"animations <scan|type|off>", options:["scan","type","off"], description:"Choose the text-reveal style. Reduced-motion preferences are respected.", example:"animations type" },
  { name:"window", group:"settings", usage:"window <float|max|crt|reset|size WIDTH HEIGHT>", options:["float","max","crt","reset","size"], description:"Resize, maximize, or restore the terminal. Orange resizes; green maximizes/restores.", example:"window size 1000 700" },
  { name:"cursor", group:"settings", usage:"cursor <on|off>", options:["on","off"], description:"Show or hide the assistant’s visual pointer.", example:"cursor off" },
  { name:"highlight", group:"settings", usage:"highlight <phrase|clear>", options:["clear"], description:"Highlight matching text in the output, or clear the highlight.", example:"highlight React" },
  { name:"contact", group:"forms", usage:'contact ["name" email "subject" "message" [phone]]', description:"With no arguments, start a draft. Providing all fields sends the message.", example:"contact" },
  { name:"subscribe", group:"forms", usage:'subscribe ["name" email-or-phone]', description:"With no arguments, start a draft. Providing both fields subscribes to updates.", example:"subscribe" },
  { name:"unsubscribe", group:"forms", usage:"unsubscribe [email-or-phone]", description:"With no arguments, start a draft. Providing a contact removes its subscription.", example:"unsubscribe" },
  { name:"set", group:"forms", usage:'set <field> "value"', options:["name","email","phone","subject","message","identifier"], description:"Edit a field in the active draft. Quote text containing spaces.", example:'set subject "Project inquiry"' },
  { name:"send", group:"forms", usage:"send", description:"Submit the active draft." },
  { name:"cancel", group:"forms", usage:"cancel", description:"Discard the active draft." },
  { name:"snake", group:"extras", usage:"snake", description:"Play Snake. Arrows/WASD move, P pauses, Escape exits." },
  { name:"pacman", group:"extras", usage:"pacman", description:"Play Pac-Man. Arrows/WASD move, P pauses, Escape exits." },
  { name:"spotify", group:"extras", usage:"spotify", description:"Show Michael’s current Spotify activity." },
  { name:"browse", group:"extras", usage:"browse [url]", aliases:["browser"], description:"Open an embedded website. With no URL, close the browser.", example:"browse wikipedia.org" },
  { name:"visitors", group:"extras", usage:"visitors", description:"Show visitor traffic by country." },
  { name:"terms", group:"extras", usage:"terms", description:"Read the terms of service." },
  { name:"privacy", group:"extras", usage:"privacy", description:"Read the privacy policy." },
  { name:"help", group:"terminal", usage:"help [command|category|all]", aliases:["?"], description:"Show a quick guide, focused command help, or the full reference.", example:"help toggle" },
  { name:"clear", group:"terminal", usage:"clear", aliases:["cls"], description:"Clear the terminal output." },
  { name:"reload", group:"terminal", usage:"reload", description:"Refresh portfolio data or retry a failed load." },
  { name:"focus", group:"terminal", usage:"focus", description:"Focus the command line so you can type." },
  { name:"exit", group:"terminal", usage:"exit", aliases:["quit","q"], description:"Close the terminal. quit/q exit an active game first." },
];

export const COMMANDS = TERMINAL_COMMANDS.flatMap(command => [command.name, ...(command.aliases ?? [])]);
export function terminalCommand(name: string) {
  const key = name.toLowerCase().replace(/^\//, "");
  return TERMINAL_COMMANDS.find(command => command.name === key || command.aliases?.includes(key));
}

export function terminalHelp(topic = "") {
  const key = topic.trim().toLowerCase().replace(/^\//, "");
  if (!key) return { overview:true, commands:[] as Command[] };
  const exact = terminalCommand(key);
  const commands = exact ? [exact] : TERMINAL_COMMANDS.filter(command => key === "all" || command.group === key || command.name.startsWith(key));
  return { overview:false, commands };
}

export type CompletionContext = { directories?: string[]; entities?: string[]; searches?: string[]; resultCount?: number; fields?: string[] };
export function terminalCompletions(input: string, context: CompletionContext = {}): string[] {
  const leading = input.match(/^\s*/)?.[0] ?? "";
  const raw = input.slice(leading.length);
  if (!raw) return [];
  if (!/\s/.test(raw)) {
    const slash = raw.startsWith("/") ? "/" : "";
    const prefix = raw.slice(slash.length).toLowerCase();
    if (!prefix) return [];
    const names = COMMANDS.filter(name => name.startsWith(prefix));
    // A completed command can advance to its arguments; a partial prefix keeps all matches.
    return names.map(name => `${leading}${slash}${name} `);
  }
  const match = raw.match(/^(\/?\S+\s+)([\s\S]*)$/);
  if (!match) return [];
  const name = terminalCommand(match[1].trim())?.name;
  const query = match[2];
  let options: readonly string[] = [];
  if (name === "help") options = ["all", "toggle", ...COMMAND_GROUPS.map(group => group.id), ...COMMANDS];
  else if (name === "search") options = context.searches ?? [];
  else if (name === "open") options = context.entities ?? [];
  else if (name === "cd") options = context.directories ?? [];
  else if (name === "select") options = Array.from({length:context.resultCount ?? 0}, (_, i) => String(i + 1));
  else if (name === "set") options = context.fields ?? terminalCommand(name)?.options ?? [];
  else options = terminalCommand(name ?? "")?.options ?? [];
  return [...new Set(options)]
    .filter(value => value.toLowerCase().startsWith(query.toLowerCase()))
    .map(value => `${leading}${match[1]}${value}${name === "search" ? "" : " "}`)
    .filter(value => value !== input);
}

export type CompletionCycle = { seed: string; options: string[]; index: number };
export function cycleTerminalCompletion(input: string, options: string[], previous: CompletionCycle | null, backwards = false): CompletionCycle | null {
  const active = previous && previous.options[previous.index] === input ? previous : null;
  const choices = active?.options ?? options;
  if (!choices.length) return null;
  const index = active ? (active.index + (backwards ? -1 : 1) + choices.length) % choices.length : backwards ? choices.length - 1 : 0;
  return { seed:active?.seed ?? input, options:choices, index };
}

export function resolveTerminalToggle(current: boolean, args: string[]): { enabled: boolean; statusOnly: boolean } | null {
  if (args.length > 1) return null;
  const value = args[0]?.toLowerCase();
  if (value && !toggleOptions.includes(value)) return null;
  return { enabled:value === "status" ? current : value ? value === "on" : !current, statusOnly:value === "status" };
}
