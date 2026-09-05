import { FormField } from '@/lib/types';

// Choice answers are stored as option ids (so renaming an option later doesn't
// rewrite past submissions), which means they have to be mapped back to labels
// for display. An id with no matching option — e.g. the option was deleted
// after someone answered — falls back to the raw value rather than vanishing.
export function formatAnswer(value: string | string[] | undefined, field: FormField): string {
  if (value === undefined || value === '') return '—';

  const values = Array.isArray(value) ? value : [value];
  if (values.length === 0) return '—';

  const options = field.options;
  if (!options?.length) return values.join(', ');

  return values.map(v => options.find(o => o.id === v)?.label ?? v).join(', ');
}
