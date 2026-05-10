import { describe, it, expect } from 'vitest';
import { resultClass, extractSanMoves, parseFirstTimestamp } from './pgn-utils';

describe('resultClass', () => {
  it('returns result-white for 1-0', () => {
    expect(resultClass('1-0')).toBe('result-white');
  });

  it('returns result-black for 0-1', () => {
    expect(resultClass('0-1')).toBe('result-black');
  });

  it('returns result-draw for 1/2-1/2', () => {
    expect(resultClass('1/2-1/2')).toBe('result-draw');
  });

  it('returns result-draw for undefined', () => {
    expect(resultClass(undefined)).toBe('result-draw');
  });

  it('returns result-draw for unknown result', () => {
    expect(resultClass('*')).toBe('result-draw');
  });
});

describe('extractSanMoves', () => {
  it('extracts moves from simple PGN', () => {
    expect(extractSanMoves('1. e4 e5 2. Nf3 Nc6')).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
  });

  it('returns empty array for empty string', () => {
    expect(extractSanMoves('')).toEqual([]);
  });

  it('strips comments in braces', () => {
    expect(extractSanMoves('1. e4 {best move} e5')).toEqual(['e4', 'e5']);
  });

  it('strips variations in parentheses', () => {
    expect(extractSanMoves('1. e4 (1. d4 d5) e5')).toEqual(['e4', 'e5']);
  });

  it('strips NAGs', () => {
    expect(extractSanMoves('1. e4 $1 e5 $2')).toEqual(['e4', 'e5']);
  });

  it('strips result markers', () => {
    expect(extractSanMoves('1. e4 e5 1-0')).toEqual(['e4', 'e5']);
    expect(extractSanMoves('1. e4 e5 0-1')).toEqual(['e4', 'e5']);
    expect(extractSanMoves('1. e4 e5 1/2-1/2')).toEqual(['e4', 'e5']);
    expect(extractSanMoves('1. e4 e5 *')).toEqual(['e4', 'e5']);
  });

  it('handles complex PGN with all annotations', () => {
    const pgn = '1. e4 {opening} e5 $1 2. Nf3 (2. Bc4 Bc5) Nc6 1-0';
    expect(extractSanMoves(pgn)).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
  });

  it('handles three-dot move numbers for black', () => {
    expect(extractSanMoves('1... e5 2. Nf3')).toEqual(['e5', 'Nf3']);
  });
});

describe('parseFirstTimestamp', () => {
  it('parses a valid timestamp annotation', () => {
    expect(parseFirstTimestamp('1. e4 {[%ts 1:30]} e5')).toBe(90);
  });

  it('returns 0 when no timestamp exists', () => {
    expect(parseFirstTimestamp('1. e4 e5')).toBe(0);
  });

  it('returns the first timestamp when multiple exist', () => {
    expect(parseFirstTimestamp('1. e4 {[%ts 2:00]} e5 {[%ts 3:15]}')).toBe(120);
  });

  it('handles zero minutes', () => {
    expect(parseFirstTimestamp('1. e4 {[%ts 0:45]}')).toBe(45);
  });

  it('handles large timestamps', () => {
    expect(parseFirstTimestamp('1. e4 {[%ts 90:00]}')).toBe(5400);
  });
});
