"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import styles from "./KairoDropdown.module.css";
import {
  dropdownShouldClose,
  type DropdownOption,
} from "./kairo-dropdown-state";

export function KairoDropdown({
  ariaLabel,
  id: triggerId,
  disabled = false,
  menuMinWidth,
  menuPlacement = "down",
  initialVisibleCount,
  columns = 1,
  onChange,
  options,
  value,
}: {
  ariaLabel: string;
  id?: string;
  disabled?: boolean;
  menuMinWidth?: string;
  menuPlacement?: "down" | "tablet-up";
  initialVisibleCount?: number;
  columns?: 1 | 2;
  onChange: (value: string) => void;
  options: DropdownOption[];
  value: string;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selected = options[selectedIndex] ?? options[0];
  const collapsed = Boolean(
    initialVisibleCount && options.length > initialVisibleCount,
  );
  const visibleIndices = options
    .map((_, index) => index)
    .slice(0, collapsed && !expanded ? initialVisibleCount : options.length);

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

  useEffect(() => {
    const menu = menuRef.current;
    if (!open || !menu) return;
    const scrollMenu = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      menu.scrollTop += event.deltaY;
    };
    menu.addEventListener("wheel", scrollMenu, { passive: false });
    return () => menu.removeEventListener("wheel", scrollMenu);
  }, [open]);

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setActiveIndex(index);
    setOpen(false);
  };

  const move = (direction: 1 | -1) => {
    const enabled = visibleIndices.filter((index) => !options[index]?.disabled);
    if (!enabled.length) return;
    const position = enabled.indexOf(activeIndex);
    const next =
      position < 0
        ? direction === 1
          ? enabled[0]
          : enabled.at(-1)
        : enabled[(position + direction + enabled.length) % enabled.length];
    if (next !== undefined) setActiveIndex(next);
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
        data-value={value}
        disabled={disabled}
        id={triggerId}
        onClick={() => {
          setExpanded(false);
          setActiveIndex(
            selectedIndex >= 0 &&
              (!initialVisibleCount || selectedIndex < initialVisibleCount)
              ? selectedIndex
              : 0,
          );
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
            const enabled = visibleIndices
              .map((index) => ({ option: options[index], index }))
              .filter(({ option }) => !option?.disabled);
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
        <span className={styles.triggerCopy}>
          <span>{selected?.label ?? "—"}</span>
          {selected?.meta ? <small>{selected.meta}</small> : null}
        </span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <ul
          className={`${styles.menu} ${menuPlacement === "tablet-up" ? styles.tabletUp : ""} ${columns === 2 ? styles.twoColumns : ""}`}
          id={`${id}-listbox`}
          ref={menuRef}
          role="listbox"
        >
          {visibleIndices.map((index) => {
            const option = options[index]!;
            return (
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
              <span className={styles.optionCopy}>
                <span>{option.label}</span>
                {option.meta ? <small>{option.meta}</small> : null}
              </span>
              {option.value === value && <Check aria-hidden="true" />}
            </li>
            );
          })}
          {collapsed ? (
            <li className={styles.moreRow} role="presentation">
              <button
                type="button"
                onClick={() => {
                  setExpanded((current) => !current);
                  if (!expanded && selectedIndex >= 0)
                    setActiveIndex(selectedIndex);
                }}
              >
                {expanded ? "Свернуть" : `Показать ещё · ${options.length - (initialVisibleCount ?? 0)}`}
              </button>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
