"use client";

import type { CSSProperties } from "react";
import type { RizzThemeCustomization } from "@/lib/types";
import { accentTextColor, allOptions, answerKeys, getRizzConfig, questionLabels, themeCopyFields, type RizzConfig } from "@/lib/rizz";
import { RizzCard } from "@/app/rizz/RizzPageClient";
import styles from "@/app/rizz/rizz.module.css";

const inputClass = "mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-3 text-base text-white";

export default function RizzThemeEditor({ config, name, value, onChange }: {
  config: RizzConfig;
  name?: string;
  value: RizzThemeCustomization;
  onChange: (next: RizzThemeCustomization) => void;
}) {
  const defaults = getRizzConfig({ rizzTheme: config.theme }).appearance;
  const appearance = config.appearance;

  return (
    <div className="space-y-4 rounded-xl border border-white/10 p-4">
      <div>
        <h3 className="font-nord text-base text-white">Customize {appearance.name}</h3>
        <p className="mt-2 text-xs leading-relaxed text-white/60">
          Each theme remembers its own wording and answer labels. Empty fields use the theme default.
          {config.theme === "pokemon" && " These card settings also apply to the Rival Card page."}
        </p>
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="min-w-0 space-y-4">
          {themeCopyFields.map(field => (
            <label key={field.key} className="block text-sm text-white/80">
              {field.label}
              {field.key === "description" || field.key === "cardDescription" ? (
                <textarea className={inputClass} rows={3} maxLength={field.max}
                  value={value[field.key] ?? ""} placeholder={defaults[field.key]}
                  onChange={event => onChange({ ...value, [field.key]: event.target.value })} />
              ) : (
                <input className={inputClass} maxLength={field.max}
                  value={value[field.key] ?? ""} placeholder={defaults[field.key]}
                  onChange={event => onChange({ ...value, [field.key]: event.target.value })} />
              )}
            </label>
          ))}
          <label className="flex min-h-12 items-center justify-between gap-3 text-sm text-white/80">
            Accent color
            <input type="color" className="h-11 w-16 cursor-pointer rounded border border-white/20 bg-transparent"
              value={appearance.accent} onChange={event => onChange({ ...value, accent: event.target.value })} />
          </label>
          <button type="button" className="min-h-11 rounded-lg border border-white/20 px-4 text-xs text-white/70"
            onClick={() => onChange({})}>Reset this theme to defaults</button>
        </div>
        <div className="min-w-0 xl:sticky xl:top-4">
          <p className="mb-3 text-xs text-white/60">Live preview · changes apply after saving</p>
          <div className={`${styles.page} ${styles.preview}`} data-theme={config.theme}
            style={{ "--rizz-accent": appearance.accent, "--rizz-on-accent": accentTextColor(appearance.accent) } as CSSProperties}>
            <p className={styles.eyebrow}>{appearance.tag}</p>
            <h3>{appearance.title}</h3>
            <p>{name?.trim() ? `${name.trim()}, ` : ""}{appearance.description}</p>
            <RizzCard targetName={name} config={config} />
            <span className={`${styles.primary} mt-6 w-full`}>{appearance.button}</span>
            <p className={styles.bottomNote}>{appearance.footer}</p>
          </div>
        </div>
      </div>
      <details className="border-t border-white/10 pt-3">
        <summary className="min-h-11 cursor-pointer py-3 text-sm text-white">Customize answer labels</summary>
        <p className="mb-4 text-xs leading-relaxed text-white/60">Use your own game names, deck challenges, or activities. Choices keep their original indoor/outdoor category.</p>
        <div className="space-y-5">
          {answerKeys.map(key => (
            <fieldset key={key}>
              <legend className="mb-3 text-sm text-white/80">{questionLabels[key]}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {allOptions[key].map(option => {
                  const id = `${key}:${option.value}`;
                  return <label key={id} className="block text-xs text-white/60">{option.label}
                    <input className={inputClass} maxLength={100} placeholder={option.label}
                      value={value.optionLabels?.[id] ?? ""}
                      onChange={event => onChange({ ...value, optionLabels: { ...value.optionLabels, [id]: event.target.value } })} />
                  </label>;
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </details>
    </div>
  );
}
