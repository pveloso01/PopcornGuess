import React from 'react';
import { render, screen } from '@testing-library/react';
import Home from './page';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { priority, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} />;
  },
}));

describe('Home Page', () => {
  it('renders the page heading', () => {
    render(<Home />);
    
    const heading = screen.getByRole('heading', {
      name: /to get started, edit the page\.tsx file/i,
    });
    
    expect(heading).toBeInTheDocument();
  });

  it('renders the Next.js logo', () => {
    render(<Home />);
    
    const logo = screen.getByAltText('Next.js logo');
    
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/next.svg');
  });

  it('renders the Templates link', () => {
    render(<Home />);
    
    const templatesLink = screen.getByRole('link', { name: /templates/i });
    
    expect(templatesLink).toBeInTheDocument();
    expect(templatesLink).toHaveAttribute('href', expect.stringContaining('vercel.com/templates'));
  });

  it('renders the Learning center link', () => {
    render(<Home />);
    
    const learningLink = screen.getByRole('link', { name: /learning/i });
    
    expect(learningLink).toBeInTheDocument();
    expect(learningLink).toHaveAttribute('href', expect.stringContaining('nextjs.org/learn'));
  });

  it('renders the Deploy Now button', () => {
    render(<Home />);
    
    const deployButton = screen.getByRole('link', { name: /deploy now/i });
    
    expect(deployButton).toBeInTheDocument();
    expect(deployButton).toHaveAttribute('href', expect.stringContaining('vercel.com/new'));
  });

  it('renders the Documentation link', () => {
    render(<Home />);
    
    const docsLink = screen.getByRole('link', { name: /documentation/i });
    
    expect(docsLink).toBeInTheDocument();
    expect(docsLink).toHaveAttribute('href', expect.stringContaining('nextjs.org/docs'));
  });
});

