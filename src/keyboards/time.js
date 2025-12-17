import { nowInKyiv } from "./calendar.js";

function backToCalendarRow() {
  return [{ text: "↩️ Інша дата", callback_data: "time_back_to_calendar" }];
}
function backToHourRow() {
  return [{ text: "↩️ Інша година", callback_data: "time_back_to_hour" }];
}

export function buildHourKeyboard(selectedDateStr) {
  const [Y, M, D] = selectedDateStr.split("-").map(Number);
  const k = nowInKyiv();
  const isToday = Y === k.getFullYear() && M === (k.getMonth() + 1) && D === k.getDate();

  let startHour = 0;
  if (isToday) {
    startHour = k.getHours();
    if (k.getMinutes() > 58) startHour += 1;
  }
  if (startHour > 23) {
    return {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Сьогодні вже минув ⏳", callback_data: "cal_nop" }],
          backToCalendarRow(),
        ],
      },
    };
  }

  const hours = [];
  for (let h = startHour; h <= 23; h++) hours.push(h);

  const rows = [];
  for (let i = 0; i < hours.length; i += 6) {
    rows.push(
      hours.slice(i, i + 6).map((h) => ({
        text: String(h).padStart(2, "0"),
        callback_data: `time_hour_${String(h).padStart(2, "0")}`,
      }))
    );
  }
  rows.push(backToCalendarRow());
  return { reply_markup: { inline_keyboard: rows } };
}

export function buildMinuteKeyboard(selectedDateStr, selectedHourStr, step = 10) {
  if (!selectedDateStr || !selectedHourStr) {
    return {
      reply_markup: {
        inline_keyboard: [
          [{ text: "⚠️ Обери дату ще раз", callback_data: "time_back_to_calendar" }],
        ],
      },
    };
  }

  const [Y, M, D] = selectedDateStr.split("-").map(Number);
  const H = Number(selectedHourStr);

  const k = nowInKyiv();
  const isToday = Y === k.getFullYear() && M === (k.getMonth() + 1) && D === k.getDate();

  let startMin = 0;
  if (isToday && H === k.getHours()) {
    startMin = Math.ceil((k.getMinutes() + 1) / step) * step;
  }
  if (startMin >= 60) {
    return {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Ця година вже минула ⏳", callback_data: "cal_nop" }],
          backToHourRow(),
        ],
      },
    };
  }

  const mins = [];
  for (let m = startMin; m < 60; m += step) mins.push(m);

  const buttons = mins.map((m) => ({
    text: `:${String(m).padStart(2, "0")}`,
    callback_data: `time_min_${String(m).padStart(2, "0")}`,
  }));

  const rows = [];
  for (let i = 0; i < buttons.length; i += 4) {
    rows.push(buttons.slice(i, i + 4));
  }
  rows.push([{ text: "📝 Інші хвилини", callback_data: "time_min_custom" }]);
  rows.push(backToHourRow());

  return { reply_markup: { inline_keyboard: rows } };
}
