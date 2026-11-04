import { describe, expect, test } from 'bun:test';

import isJobDue from './isJobDue';

describe('isJobDue', () => {
  const job = {
    kind: 'script',
    time: '07:30',
    enabled: true,
    notify: false
  } as const;

  const monday = (time: string) => new Date(`2026-11-02T${time}:00`);

  test('waits until the time of the job', () => {
    expect(isJobDue({ job, now: monday('07:29'), lastRunAt: undefined })).toBe(
      false
    );
  });

  test('runs after the time when it did not run today', () => {
    expect(
      isJobDue({ job, now: monday('09:00'), lastRunAt: monday('07:00') })
    ).toBe(true);
  });

  test('does not run twice on the same day', () => {
    expect(
      isJobDue({ job, now: monday('09:00'), lastRunAt: monday('07:31') })
    ).toBe(false);
  });

  test('skips a disabled job and a day that is not listed', () => {
    expect(
      isJobDue({
        job: { ...job, enabled: false },
        now: monday('09:00'),
        lastRunAt: undefined
      })
    ).toBe(false);
    expect(
      isJobDue({
        job: { ...job, weekdays: ['sat', 'sun'] },
        now: monday('09:00'),
        lastRunAt: undefined
      })
    ).toBe(false);
  });
});
