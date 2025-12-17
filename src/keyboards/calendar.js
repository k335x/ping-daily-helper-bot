const KYIV_TZ = "Europe/Kyiv";

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function nowInKyiv() {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: KYIV_TZ }));
}

export function buildMonthKeyboard(yyyy, mm) {
  const header = `${yyyy}-${String(mm).padStart(2, "0")}`;
  const dim = daysInMonth(yyyy, mm);
  const today = nowInKyiv();

  const tY = today.getFullYear();
  const tM = today.getMonth() + 1;
  const tD = today.getDate();

  const monthIsPast = yyyy < tY || (yyyy === tY && mm < tM);
  const monthIsCurrent = yyyy === tY && mm === tM;

  if (monthIsPast) {
    const k = nowInKyiv();
    return buildMonthKeyboard(k.getFullYear(), k.getMonth() + 1);
  }

  const rows = [];

  const canGoPrev = !(monthIsPast || monthIsCurrent && mm === tM);
  rows.push([
    {
      text: canGoPrev ? "⟨" : " ",
      callback_data: canGoPrev ? `cal_nav_prev_${header}` : "cal_nop",
    },
    { text: `📅 ${header}`, callback_data: "cal_nop" },
    { text: "⟩", callback_data: `cal_nav_next_${header}` },
  ]);

  rows.push([
    { text: "Пн", callback_data: "cal_nop" },
    { text: "Вт", callback_data: "cal_nop" },
    { text: "Ср", callback_data: "cal_nop" },
    { text: "Чт", callback_data: "cal_nop" },
    { text: "Пт", callback_data: "cal_nop" },
    { text: "Сб", callback_data: "cal_nop" },
    { text: "Нд", callback_data: "cal_nop" },
  ]);

  const availableDays = [];
  for (let d = 1; d <= dim; d++) {
    if (monthIsCurrent && d < tD) continue;
    availableDays.push({
      text: String(d),
      callback_data: `cal_pick_${yyyy}-${String(mm).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    });
  }

  for (let i = 0; i < availableDays.length; i += 7) {
    rows.push(availableDays.slice(i, i + 7));
  }

  return { reply_markup: { inline_keyboard: rows } };
}
