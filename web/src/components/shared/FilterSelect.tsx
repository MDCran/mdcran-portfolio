"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import styles from "./FilterSelect.module.css";

export default function FilterSelect({ value, onChange, label, options, className }: {
  className?: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className={`${styles.trigger} ${className ?? ""}`} aria-label={label}>
        <Select.Value />
        <Select.Icon className={styles.icon}><ChevronDown size={14} aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className={styles.menu} position="popper" sideOffset={6} collisionPadding={16} onEscapeKeyDown={(event) => event.stopPropagation()}>
          <Select.Viewport className={styles.options}>
            {options.map((option) => (
              <Select.Item className={styles.option} key={option.value} value={option.value}>
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className={styles.check}><Check size={14} aria-hidden="true" /></Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
