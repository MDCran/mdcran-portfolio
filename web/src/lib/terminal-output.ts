export type TerminalLogEntry = {
  id: string;
  prompt?: string;
  text?: string;
  tone?: "default" | "muted" | "success" | "error" | "accent";
  links?: Array<{ label: string; href: string }>;
  instant?: boolean;
  preserveWhitespace?: boolean;
};

type PrintedEntry = {
  entry: TerminalLogEntry;
  ends: number[];
  count: number;
  shown: boolean;
};

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
function characterEnds(text: string) {
  return Array.from(segmenter.segment(text), part => part.index + part.segment.length);
}

/** One ordered character queue for boot, command output and streamed AI text.
 * The UI uses pulse only after committing the corresponding visible characters. */
export class TerminalPrinter {
  private rows: PrintedEntry[] = [];
  private latestPrompt: string | undefined;
  private previousTime: number | null = null;
  private credit = 0;
  private pulse = 0;

  sync(entries: TerminalLogEntry[]) {
    const previous = new Map(this.rows.map(row => [row.entry.id, row]));
    this.rows = entries.map(entry => {
      const row = previous.get(entry.id);
      if (!row) return { entry, ends: characterEnds(entry.text ?? ""), count: 0, shown: false };
      if (row.entry.text !== entry.text) {
        const oldText = row.entry.text ?? "";
        const newText = entry.text ?? "";
        const visibleEnd = row.ends[row.count - 1] ?? 0;
        let common = 0;
        while (common < visibleEnd && oldText[common] === newText[common]) common++;
        row.ends = characterEnds(newText);
        row.count = row.ends.filter(end => end <= common).length;
      }
      row.entry = entry;
      // Status replacements and live counters do not retype or produce clicks.
      if (entry.instant && row.shown) row.count = row.ends.length;
      return row;
    });
    const promptIndex = entries.findLastIndex(entry => entry.prompt != null);
    const prompt = entries[promptIndex]?.id;
    if (prompt && prompt !== this.latestPrompt) {
      // A new command never waits behind an old output animation.
      this.rows.slice(0, promptIndex + 1).forEach(row => { row.shown = true; row.count = row.ends.length; });
      this.resetClock();
    }
    this.latestPrompt = prompt;
  }

  get pending() {
    return this.rows.some(row => !row.shown || row.count < row.ends.length);
  }

  resetClock() {
    this.previousTime = null;
    this.credit = 0;
  }

  finish() {
    this.rows.forEach(row => { row.shown = true; row.count = row.ends.length; });
    this.resetClock();
  }

  advance(now: number) {
    const elapsed = this.previousTime === null ? 0 : Math.max(0, Math.min(40, now - this.previousTime));
    this.previousTime = now;
    const remaining = this.rows.reduce((sum, row) => sum + row.ends.length - row.count, 0);
    this.credit += elapsed * (remaining > 500 ? 180 : 90) / 1000;
    let changed = false;
    let printed = "";
    for (const row of this.rows) {
      if (row.shown && row.count === row.ends.length) continue;
      const immediate = row.entry.instant || row.entry.prompt != null || row.entry.links || !row.ends.length;
      const amount = immediate ? row.ends.length - row.count : Math.min(Math.floor(this.credit), row.ends.length - row.count);
      if (!immediate && amount === 0) break;
      const start = row.ends[row.count - 1] ?? 0;
      row.count += amount;
      row.shown = true;
      changed = true;
      if (!immediate) {
        this.credit -= amount;
        printed += (row.entry.text ?? "").slice(start, row.ends[row.count - 1]);
      }
      if (row.count < row.ends.length) break;
    }
    if (/\S/u.test(printed)) this.pulse++;
    if (!this.pending) this.resetClock();
    return changed;
  }

  view() {
    return {
      lines: this.rows.filter(row => row.shown).map(row => ({
        entry: row.entry,
        text: (row.entry.text ?? "").slice(0, row.ends[row.count - 1] ?? 0),
      })),
      pending: this.pending,
      pulse: this.pulse,
    };
  }
}
