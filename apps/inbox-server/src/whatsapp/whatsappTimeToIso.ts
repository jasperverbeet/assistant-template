const TIME_ZONE = 'Europe/Amsterdam';
const FUTURE_SLACK_MS = 60_000;
const DAY_NAMES: Record<string, number> = {
  zondag: 0,
  maandag: 1,
  dinsdag: 2,
  woensdag: 3,
  donderdag: 4,
  vrijdag: 5,
  zaterdag: 6,
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};
const DATE_TIME = /^(\d{1,2}):(\d{2}), (\d{1,2})-(\d{1,2})-(\d{4})$/;
const TIME = /^(\d{1,2}):(\d{2})$/;
const DATE = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
const YESTERDAY = new Set(['gisteren', 'yesterday']);

interface WhatsappTimeToIsoOptions {
  time: string;
  receivedAt: string;
}

/**
 * Converts the time text of WhatsApp Web to an ISO time. WhatsApp shows local
 * times in the time zone `Europe/Amsterdam`. The rules:
 *
 * - `21:59, 03-11-2026` (a chat row) gives that date and time.
 * - `21:59` (a preview of today) gives that time on the local day of
 *   `receivedAt`. When that is more than one minute after `receivedAt`, it
 *   gives the day before.
 * - `gisteren` gives 00:00 of the day before `receivedAt`.
 * - A weekday gives 00:00 of the last such day before the day of `receivedAt`.
 * - `03-11-2026` gives 00:00 of that date.
 * - Any other text gives `receivedAt`.
 *
 * @param options - The time text and the time the server received the entry.
 * @returns The ISO time in UTC.
 */
const whatsappTimeToIso = ({ time, receivedAt }: WhatsappTimeToIsoOptions) => {
  const received = new Date(receivedAt);
  const offsetMs = (instant: number) => {
    const name =
      new Intl.DateTimeFormat('en', {
        timeZone: TIME_ZONE,
        timeZoneName: 'longOffset'
      })
        .formatToParts(instant)
        .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT';
    const [, sign = '+', hours = '0', minutes = '0'] =
      /GMT([+-])(\d{2}):(\d{2})/.exec(name) ?? [];

    return (
      (sign === '-' ? -1 : 1) * (Number(hours) * 60 + Number(minutes)) * 60_000
    );
  };
  const toUtc = (
    year: number,
    month: number,
    day: number,
    hour = 0,
    minute = 0
  ) => {
    const asUtc = Date.UTC(year, month - 1, day, hour, minute);
    const first = asUtc - offsetMs(asUtc);

    return new Date(asUtc - offsetMs(first));
  };
  const [year = 0, month = 0, day = 0] = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
    .format(received)
    .split('-')
    .map(Number);
  const text = time.trim().toLowerCase();
  const dateTime = DATE_TIME.exec(text);

  if (dateTime) {
    const [, hour, minute, dateDay, dateMonth, dateYear] = dateTime.map(Number);

    return toUtc(dateYear!, dateMonth!, dateDay!, hour, minute).toISOString();
  }

  const clock = TIME.exec(text);

  if (clock) {
    const today = toUtc(year, month, day, Number(clock[1]), Number(clock[2]));

    return (
      today.getTime() > received.getTime() + FUTURE_SLACK_MS
        ? toUtc(year, month, day - 1, Number(clock[1]), Number(clock[2]))
        : today
    ).toISOString();
  }

  if (YESTERDAY.has(text)) {
    return toUtc(year, month, day - 1).toISOString();
  }

  const weekday = DAY_NAMES[text];

  if (weekday !== undefined) {
    const today = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

    return toUtc(
      year,
      month,
      day - ((today - weekday + 7) % 7 || 7)
    ).toISOString();
  }

  const date = DATE.exec(text);

  if (date) {
    return toUtc(
      Number(date[3]),
      Number(date[2]),
      Number(date[1])
    ).toISOString();
  }

  return received.toISOString();
};

export default whatsappTimeToIso;
