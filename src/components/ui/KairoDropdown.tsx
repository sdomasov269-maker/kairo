"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import styles from "./KairoDropdown.module.css";
import {
  dropdownShouldClose,
  nextDropdownIndex,
  type DropdownOption,
} from "./kairo-dropdown-state";

export function KairoDropdown({
  ariaLabel,
  disabled = false,
  menuMinWidth,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  disabled?: boolean;
  menuMinWidth?: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  value: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selected = options[selectedIndex] ?? options[0];

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (
        rootRef.current &&
        dropdownShouldClose(
          (target) => rootRef.current?.contains(target as Node) ?? false,
          event.target,
        )
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setActiveIndex(index);
    setOpen(false);
  };

  const move = (direction: 1 | -1) => {
    const index = nextDropdownIndex(
      options,
      activeIndex >= 0 ? activeIndex : selectedIndex,
      direction,
    );
    if (index >= 0) setActiveIndex(index);
  };

  return (
    <div
      className={styles.root}
      ref={rootRef}
      style={
        menuMinWidth
          ? ({ "--dropdown-menu-min-width": menuMinWidth } as CSSProperties)
          : undefined
      }
    >
      <button
        aria-activedescendant={
          open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
        }
        aria-controls={`${id}-listbox`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={styles.trigger}
        disabled={disabled}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) setOpen(true);
            move(event.key === "ArrowDown" ? 1 : -1);
            return;
          }
          if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            const enabled = options
              .map((option, index) => ({ option, index }))
              .filter(({ option }) => !option.disabled);
            setActiveIndex(
              enabled[event.key === "Home" ? 0 : enabled.length - 1]?.index ??
                -1,
            );
            if (!open) setOpen(true);
            return;
          }
          if ((event.key === "Enter" || event.key === " ") && open) {
            event.preventDefault();
            choose(activeIndex);
          }
        }}
        type="button"
      >
        <span>{selected?.label ?? "—"}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <ul className={styles.menu} id={`${id}-listbox`} role="listbox">
          {options.map((option, index) => (
            <li
              aria-disabled={option.disabled || undefined}
              aria-selected={option.value === value}
              className={`${styles.option} ${index === activeIndex ? styles.active : ""} ${option.value === value ? styles.selected : ""} ${option.disabled ? styles.disabled : ""}`}
              id={`${id}-option-${index}`}
              key={option.value}
              onClick={() => choose(index)}
              onMouseEnter={() => {
                if (!option.disabled) setActiveIndex(index);
              }}
              role="option"
            >
              <span>{option.label}</span>
              {option.value === value && <Check aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
