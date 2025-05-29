import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';

const customRender = (ui: ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: ({ children }) => children, ...options });

export * from '@testing-library/react';
export { userEvent, customRender };
