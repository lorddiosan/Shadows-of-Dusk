import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { App } from '../../App';

describe('App Component Render', () => {
  it('renders App component without crashing', () => {
    const html = renderToString(React.createElement(App));
    expect(html).toBeDefined();
    expect(html).toContain('WARPATH');
  });
});
