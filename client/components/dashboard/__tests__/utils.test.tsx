import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { prettyTooltip, displayCell } from '../utils';

describe('Dashboard Utils', () => {
  describe('prettyTooltip', () => {
    it('handles undefined and null values', () => {
      expect(prettyTooltip(undefined)).toBe('');
      expect(prettyTooltip(null)).toBe('');
    });

    it('handles string values', () => {
      expect(prettyTooltip('simple string')).toBe('simple string');
    });

    it('parses JSON arrays in strings', () => {
      const jsonArray = '["item1", "item2", "item3"]';
      expect(prettyTooltip(jsonArray)).toBe('item1, item2, item3');
    });

    it('parses JSON objects in strings', () => {
      const jsonObject = '{"key": "value", "number": 42}';
      const result = prettyTooltip(jsonObject);
      expect(result).toContain('"key": "value"');
      expect(result).toContain('"number": 42');
    });

    it('handles invalid JSON strings gracefully', () => {
      const invalidJson = '{"invalid": json}';
      expect(prettyTooltip(invalidJson)).toBe(invalidJson);
    });

    it('handles arrays directly', () => {
      const array = ['item1', 'item2', 'item3'];
      expect(prettyTooltip(array)).toBe('item1, item2, item3');
    });

    it('handles objects directly', () => {
      const object = { key: 'value', number: 42 };
      const result = prettyTooltip(object);
      expect(result).toContain('"key": "value"');
      expect(result).toContain('"number": 42');
    });

    it('handles primitive values', () => {
      expect(prettyTooltip(42)).toBe('42');
      expect(prettyTooltip(true)).toBe('true');
    });
  });

  describe('displayCell', () => {
    it('renders N/A span for undefined/null values', () => {
      const { container: container1 } = render(<div>{displayCell(undefined)}</div>);
      const { container: container2 } = render(<div>{displayCell(null)}</div>);
      const { container: container3 } = render(<div>{displayCell('undefined')}</div>);
      const { container: container4 } = render(<div>{displayCell('null')}</div>);

      expect(container1.querySelector('span')).toHaveClass('text-gray-400', 'italic');
      expect(container1.textContent).toBe('N/A');
      expect(container2.querySelector('span')).toHaveClass('text-gray-400', 'italic');
      expect(container3.querySelector('span')).toHaveClass('text-gray-400', 'italic');
      expect(container4.querySelector('span')).toHaveClass('text-gray-400', 'italic');
    });

    it('handles bigint values', () => {
      const bigintValue = BigInt(123456789);
      const result = displayCell(bigintValue);
      expect(result).toBe('123456789');
    });

    it('parses JSON arrays in strings', () => {
      const jsonArray = '["item1", "item2", "item3"]';
      const result = displayCell(jsonArray);
      expect(result).toBe('item1, item2, item3');
    });

    it('parses JSON objects in strings', () => {
      const jsonObject = '{"key": "value"}';
      const result = displayCell(jsonObject);
      expect(result).toBe('{"key":"value"}');
    });

    it('handles invalid JSON strings gracefully', () => {
      const invalidJson = '{"invalid": json}';
      const result = displayCell(invalidJson);
      expect(result).toBe(invalidJson);
    });

    it('handles regular strings', () => {
      const regularString = 'just a regular string';
      const result = displayCell(regularString);
      expect(result).toBe(regularString);
    });

    it('handles arrays directly', () => {
      const array = ['item1', 'item2', 'item3'];
      const result = displayCell(array);
      expect(result).toBe('item1, item2, item3');
    });

    it('handles objects directly', () => {
      const object = { key: 'value', number: 42 };
      const result = displayCell(object);
      expect(result).toBe('{"key":"value","number":42}');
    });

    it('handles primitive values', () => {
      expect(displayCell(42)).toBe('42');
      expect(displayCell(true)).toBe('true');
      expect(displayCell(false)).toBe('false');
    });

    it('handles empty arrays and objects', () => {
      expect(displayCell([])).toBe('');
      expect(displayCell({})).toBe('{}');
    });

    it('handles nested structures', () => {
      const nested = { 
        array: [1, 2, 3], 
        object: { nested: 'value' },
        primitive: 'string'
      };
      const result = displayCell(nested);
      expect(result).toContain('"array":[1,2,3]');
      expect(result).toContain('"nested":"value"');
      expect(result).toContain('"primitive":"string"');
    });
  });
}); 