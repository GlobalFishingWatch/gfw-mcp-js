import { describe, it, expect } from 'vitest';
import { createToolResponse, createErrorResponse } from '../../lib/response.js';

describe('createToolResponse', () => {
  it('returns isError false', () => {
    const result = createToolResponse('hello', { foo: 'bar' });
    expect(result.isError).toBe(false);
  });

  it('sets text content', () => {
    const result = createToolResponse('hello', {});
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe('hello');
  });

  it('sets structuredContent', () => {
    const structured = { total: 3, results: [] };
    const result = createToolResponse('x', structured);
    expect(result.structuredContent).toEqual(structured);
  });
});

describe('createErrorResponse', () => {
  it('returns isError true', () => {
    const result = createErrorResponse('something went wrong');
    expect(result.isError).toBe(true);
  });

  it('sets text content to message', () => {
    const result = createErrorResponse('oops');
    expect(result.content[0].text).toBe('oops');
    expect(result.content[0].type).toBe('text');
  });

  it('has no structuredContent', () => {
    const result = createErrorResponse('err');
    expect('structuredContent' in result).toBe(false);
  });
});
