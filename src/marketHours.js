// Mirrors the backend's StockFetcher.MarketHours logic client-side, so
// the UI can explain an empty table honestly instead of just looking
// broken. NYSE/NASDAQ standard hours: Mon-Fri, 9:30 AM - 4:00 PM Eastern.
// Uses Intl.DateTimeFormat with the America/New_York zone so DST is
// handled automatically, same as the backend's DateTime.shift_zone!.

function getEasternParts(date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  const weekdayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

  return {
    dayOfWeek: weekdayMap[lookup.weekday],
    hour: Number(lookup.hour) % 24,
    minute: Number(lookup.minute),
  };
}

export function isMarketOpen(date = new Date()) {
  const { dayOfWeek, hour, minute } = getEasternParts(date);

  if (dayOfWeek > 5) return false; // Sat/Sun

  const minutesNow = hour * 60 + minute;
  const open = 9 * 60 + 30; // 9:30 AM
  const close = 16 * 60; // 4:00 PM

  return minutesNow >= open && minutesNow < close;
}

// Rough estimate of hours remaining until the next 9:30 AM ET weekday
// open. Doesn't need to be exact to the second - just enough for a
// human-readable "reopens in ~X hours" message.
export function hoursUntilNextOpen(date = new Date()) {
  const { dayOfWeek, hour, minute } = getEasternParts(date);
  const minutesNow = hour * 60 + minute;
  const open = 9 * 60 + 30;

  let daysAhead = 0;
  let minutesUntilOpen;

  if (dayOfWeek <= 5 && minutesNow < open) {
    // still before today's open
    minutesUntilOpen = open - minutesNow;
  } else {
    // find the next weekday
    daysAhead = 1;
    let nextDay = dayOfWeek + 1;
    while (nextDay > 5) {
      nextDay = nextDay > 7 ? nextDay - 7 : nextDay;
      if (nextDay > 5) {
        daysAhead += 1;
        nextDay += 1;
      }
    }
    minutesUntilOpen = (24 * 60 - minutesNow) + open + (daysAhead - 1) * 24 * 60;
  }

  return Math.round((minutesUntilOpen / 60) * 10) / 10;
}
