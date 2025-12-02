import React from 'react';
import RootLayout from './layout';

// Mock next/font/google
jest.mock('next/font/google', () => ({
  Geist: () => ({
    variable: '--font-geist-sans',
    subsets: ['latin'],
  }),
  Geist_Mono: () => ({
    variable: '--font-geist-mono',
    subsets: ['latin'],
  }),
}));

// Mock CSS imports
jest.mock('./globals.css', () => ({}));

describe('RootLayout', () => {
  it('renders with the correct structure', () => {
    const children = <div>Test Content</div>;
    const result = RootLayout({ children });

    // Verify the component returns the expected structure
    expect(result).toBeDefined();
    expect(result.type).toBe('html');
    expect(result.props.lang).toBe('en');
  });

  it('applies correct font classes to body', () => {
    const children = <div>Test Content</div>;
    const result = RootLayout({ children });

    // Check the body element
    const bodyElement = result.props.children;
    expect(bodyElement.type).toBe('body');
    expect(bodyElement.props.className).toContain('--font-geist-sans');
    expect(bodyElement.props.className).toContain('--font-geist-mono');
    expect(bodyElement.props.className).toContain('antialiased');
  });

  it('renders children correctly', () => {
    const testChild = <div data-testid="test">Child Content</div>;
    const result = RootLayout({ children: testChild });

    // Verify children are passed through
    const bodyElement = result.props.children;
    expect(bodyElement.props.children).toEqual(testChild);
  });

  it('renders multiple children correctly', () => {
    const children = (
      <>
        <div>First Child</div>
        <div>Second Child</div>
      </>
    );
    const result = RootLayout({ children });

    const bodyElement = result.props.children;
    expect(bodyElement.props.children).toEqual(children);
  });
});

