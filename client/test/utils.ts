import { render, RenderOptions, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';

// Explicitly typing customRender
const customRender = (ui: ReactElement, options?: RenderOptions): RenderResult => {
  return render(ui, { wrapper: ({ children }) => children, ...options });
};

export * from '@testing-library/react';
export { userEvent, customRender };
