import { describe, expect, test } from 'bun:test';

import whatsappTimeToIso from './whatsappTimeToIso';

describe('whatsappTimeToIso', () => {
  const winter = '2026-11-03T21:00:00.000Z';
  const convert = (time: string, receivedAt = winter) =>
    whatsappTimeToIso({ time, receivedAt });

  test('reads the date and time of a chat row in winter time', () => {
    expect(convert('21:59, 03-11-2026')).toBe('2026-11-03T20:59:00.000Z');
  });

  test('reads the date and time of a chat row in summer time', () => {
    expect(convert('10:35, 09-06-2025')).toBe('2025-06-09T08:35:00.000Z');
  });

  test('reads a time of today', () => {
    expect(convert('21:59')).toBe('2026-11-03T20:59:00.000Z');
  });

  test('gives yesterday for a time after receivedAt', () => {
    expect(convert('23:59', '2026-11-03T23:01:00.000Z')).toBe(
      '2026-11-03T22:59:00.000Z'
    );
  });

  test('uses the local day at midnight', () => {
    expect(convert('00:30', '2026-11-03T23:31:00.000Z')).toBe(
      '2026-11-03T23:30:00.000Z'
    );
  });

  test('reads gisteren as the start of the day before', () => {
    expect(convert('gisteren')).toBe('2026-11-01T23:00:00.000Z');
  });

  test('reads a weekday as the last such day before today', () => {
    expect(convert('zondag')).toBe('2026-10-31T23:00:00.000Z');
    expect(convert('Dinsdag')).toBe('2026-10-26T23:00:00.000Z');
  });

  test('reads a date', () => {
    expect(convert('13-10-2026')).toBe('2026-10-12T22:00:00.000Z');
  });

  test('gives receivedAt for an unknown text', () => {
    expect(convert('earlier')).toBe(winter);
  });
});
