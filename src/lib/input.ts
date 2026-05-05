export function clearZeroOnFocus(e: FocusEvent): void {
  const target = e.currentTarget;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.value === '0') target.value = '';
}
