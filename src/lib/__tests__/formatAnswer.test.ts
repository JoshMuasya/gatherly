import { describe, it, expect } from 'vitest';
import { formatAnswer } from '../formatAnswer';
import { FormField } from '@/lib/types';

const singleChoice: FormField = {
  id: 'q1',
  type: 'single_select',
  label: 'Will you be available to attend?',
  required: false,
  order: 0,
  options: [
    { id: 'd1f76a0a-b6aa-4c7e-937c-ce74cec6e258', label: 'Yes' },
    { id: 'a2e88b1b-1111-2222-3333-444455556666', label: 'No' },
    { id: 'c3f99c2c-7777-8888-9999-000011112222', label: 'Not Sure' },
  ],
};

const multiChoice: FormField = { ...singleChoice, id: 'q2', type: 'multi_select' };

const shortText: FormField = {
  id: 'q3', type: 'short_text', label: 'Full name', required: true, order: 1,
};

describe('formatAnswer', () => {
  it('renders the option label, not the stored uuid', () => {
    expect(formatAnswer('d1f76a0a-b6aa-4c7e-937c-ce74cec6e258', singleChoice)).toBe('Yes');
    expect(formatAnswer('c3f99c2c-7777-8888-9999-000011112222', singleChoice)).toBe('Not Sure');
  });

  it('renders multi-select answers as a readable list of labels', () => {
    const answer = ['d1f76a0a-b6aa-4c7e-937c-ce74cec6e258', 'c3f99c2c-7777-8888-9999-000011112222'];
    expect(formatAnswer(answer, multiChoice)).toBe('Yes, Not Sure');
  });

  it('passes plain text answers through untouched', () => {
    expect(formatAnswer('Joshua', shortText)).toBe('Joshua');
  });

  it('shows a dash for unanswered fields', () => {
    expect(formatAnswer(undefined, shortText)).toBe('—');
    expect(formatAnswer('', shortText)).toBe('—');
    expect(formatAnswer([], multiChoice)).toBe('—');
  });

  // If an admin deletes an option after someone answered it, the stored id no
  // longer resolves — show the raw value rather than silently dropping data.
  it('falls back to the raw value for an option that no longer exists', () => {
    expect(formatAnswer('deleted-option-id', singleChoice)).toBe('deleted-option-id');
  });
});
