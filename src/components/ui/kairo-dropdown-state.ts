export type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function nextDropdownIndex(
  options: DropdownOption[],
  current: number,
  direction: 1 | -1,
) {
  if (!options.some((option) => !option.disabled)) return -1;
  for (let offset = 1; offset <= options.length; offset += 1) {
    const index =
      (current + direction * offset + options.length) % options.length;
    if (!options[index].disabled) return index;
  }
  return -1;
}

export function dropdownShouldClose(
  contains: (target: EventTarget | null) => boolean,
  target: EventTarget | null,
) {
  return !contains(target);
}
