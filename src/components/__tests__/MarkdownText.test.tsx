import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownText } from '../MarkdownText';

describe('MarkdownText', () => {
  it('renders bold and italic', () => {
    const { container } = render(<MarkdownText>{'**bold** and *italic*'}</MarkdownText>);
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('em')?.textContent).toBe('italic');
  });

  it('renders links safely in a new tab', () => {
    render(<MarkdownText>{'[Pay here](https://example.com)'}</MarkdownText>);
    const link = screen.getByRole('link', { name: 'Pay here' });
    expect(link.getAttribute('href')).toBe('https://example.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('renders bullet lists', () => {
    const { container } = render(<MarkdownText>{'- one\n- two'}</MarkdownText>);
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('preserves single line breaks as typed', () => {
    const { container } = render(<MarkdownText>{'line one\nline two'}</MarkdownText>);
    expect(container.querySelectorAll('br')).toHaveLength(1);
  });

  it('passes emojis through untouched', () => {
    render(<MarkdownText>{'Bring water 🥾🙌'}</MarkdownText>);
    expect(screen.getByText(/Bring water 🥾🙌/)).toBeTruthy();
  });

  // The security property this component relies on: no rehype-raw, so
  // admin-authored HTML is escaped and shown as text, never executed.
  it('escapes raw HTML instead of rendering it', () => {
    const { container } = render(
      <MarkdownText>{'<script>alert(1)</script><img src=x onerror=alert(1)>'}</MarkdownText>
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });
});
