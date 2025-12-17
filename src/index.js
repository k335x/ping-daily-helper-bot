import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { db } from "./db.js";
import { listTasks } from "./commands/listTasks.js";
import { mainMenu } from "./keyboards/mainMenu.js";
import "./scheduler.js";

dotenv.config();

const KYIV_TZ = "Europe/Kyiv";

function nowInKyiv() {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: KYIV_TZ }));
}

function toUtcFromKyivParts(y, m /*1..12*/, d, hh, mm) {
  return new Date(Date.UTC(y, m - 1, d, hh, mm));
}

function isPastKyiv(candidate) {
  return candidate.getTime() <= nowInKyiv().getTime();
}


function parseUserDateTimeToUTC(input) {
  const s = input.trim().toLowerCase().replace(/\s+/g, " ");
  const k = nowInKyiv();
  const curY = k.getFullYear();

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/);
  if (m) {
    const [_, Y, Mo, D, H, Mi] = m;
    const y = Number(Y), mo = Number(Mo), d = Number(D), hh = Number(H), mm = Number(Mi);
    const kyiv = new Date(`${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}T${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}:00`);
    return toUtcFromKyivParts(y, mo, d, hh, mm);
  }

  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (m) {
    const [_, D, Mo, Y, H, Mi] = m;
    const y = Number(Y), mo = Number(Mo), d = Number(D), hh = Number(H), mm = Number(Mi);
    return toUtcFromKyivParts(y, mo, d, hh, mm);
  }

  m = s.match(/^(\d{1,2})\.(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
  if (m) {
    const [_, D, Mo, H, Mi] = m;
    const y = curY, mo = Number(Mo), d = Number(D), hh = Number(H), mm = Number(Mi);
    return toUtcFromKyivParts(y, mo, d, hh, mm);
  }

  m = s.match(/^(сьогодні|сегодня|today|завтра|tomorrow)\s+(\d{1,2}):(\d{2})$/);
  if (m) {
    const word = m[1];
    const hh = Number(m[2]), mm = Number(m[3]);
    const base = nowInKyiv();
    if (/завтра|tomorrow/.test(word)) {
      base.setDate(base.getDate() + 1);
    }
    const y = base.getFullYear(), mo = base.getMonth() + 1, d = base.getDate();
    return toUtcFromKyivParts(y, mo, d, hh, mm);
  }

  m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const hh = Number(m[1]), mm = Number(m[2]);
    const base = nowInKyiv();
    const y = base.getFullYear(), mo = base.getMonth() + 1, d = base.getDate();
    const todayUTC = toUtcFromKyivParts(y, mo, d, hh, mm);
    if (!isPastKyiv(new Date(todayUTC.getTime() - (todayUTC.getTimezoneOffset()*60000)))) {
    }
    const nowK = nowInKyiv();
    const candidateK = new Date(Date.UTC(y, mo - 1, d, hh, mm));
    const candidateIsPast = candidateK.getTime() <= nowK.getTime();
    if (!candidateIsPast) return todayUTC;
    const tom = nowInKyiv(); tom.setDate(tom.getDate() + 1);
    return toUtcFromKyivParts(tom.getFullYear(), tom.getMonth() + 1, tom.getDate(), hh, mm);
  }

  return null;
}

const token = process.env.BOT_TOKEN;
if (!token) {
  process.exit(1);
}

export const bot = new TelegramBot(token, { polling: true });

bot.chatState = {};

bot.onText(/\/start/, async (msg) => {
  const chatId = String(msg.chat.id);

  const userRef = db.collection("users").doc(chatId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    await userRef.set({
      username: msg.chat.username || "unknown",
      firstSeen: new Date(),
    });
    console.log("New user added:", chatId);
  }

  return bot.sendMessage(
    chatId,
    "Привіт! 👋 Я PingDailyHelperBot.\nЩо хочеш зробити?",
    mainMenu
  );
});

bot.on("callback_query", async (cb) => {
  const chatId = String(cb?.message?.chat?.id || "");
  const data = cb?.data || "";
  if (!chatId) return bot.answerCallbackQuery(cb.id);

  if (data.startsWith("done_")) {
    const taskId = data.slice(5);
    await db.collection("users").doc(chatId).collection("tasks").doc(taskId).update({ done: true });
    return bot.answerCallbackQuery(cb.id, { text: "✅ Готово" });
  }

  if (data.startsWith("delete_")) {
    const taskId = data.slice(7);
    await db.collection("users").doc(chatId).collection("tasks").doc(taskId).delete();
    return bot.answerCallbackQuery(cb.id, { text: "🗑 Видалено" });
  }

  return bot.answerCallbackQuery(cb.id);
});

bot.on("message", async (msg) => {
  const chatId = String(msg.chat.id);
  const text = msg.text;
  const state = bot.chatState[chatId];

  if (text === "➕ Додати задачу") {
    bot.chatState[chatId] = { step: "awaiting_text" };
    return bot.sendMessage(chatId, "📝 Введи текст задачі:");
  }

  if (state?.step === "awaiting_text" && text) {
    bot.chatState[chatId].taskText = text;
    bot.chatState[chatId].step = "awaiting_datetime";
    return bot.sendMessage(
      chatId,
      "⏰ Введи дату й час одним рядком.\nПриклади:\n" +
        "• 2025-12-17 13:20\n" +
        "• 17.12.2025 13:20\n" +
        "• 17.12 13:20  (поточний рік)\n" +
        "• сьогодні 18:00 / завтра 09:15\n" +
        "• 13:20  (сьогодні, або завтра якщо вже минуло)"
    );
  }

  if (state?.step === "awaiting_datetime" && typeof text === "string") {
    const utc = parseUserDateTimeToUTC(text);
    if (!utc) {
      return bot.sendMessage(
        chatId,
        "⚠️ Не впізнав формат. Спробуй так:\n" +
          "2025-12-17 13:20 або 17.12.2025 13:20 або сьогодні 18:00 або просто 13:20"
      );
    }

    const kyivNow = nowInKyiv().getTime();
    if (utc.getTime() <= kyivNow - (new Date().getTimezoneOffset() * 60000)) {
      const candidateK = new Date(utc); // це UTC
      if (candidateK.getTime() <= nowInKyiv().getTime()) {
        return bot.sendMessage(chatId, "⏳ Цей час уже минув. Вкажи інший, будь ласка.");
      }
    }

    await db.collection("users").doc(chatId).collection("tasks").add({
      text: state.taskText,
      done: false,
      createdAt: new Date(),
      remindType: "oneoff",
      remindAt: utc,
      lastNotifiedAt: null,
    });

    bot.chatState[chatId] = null;

    const k = nowInKyiv();
    const tzName = "Kyiv";
    const dd = (n) => String(n).padStart(2, "0");
    const whenK = new Date(utc);
    return bot.sendMessage(
      chatId,
      "✅ Збережено! Нагадування встановлено."
    );
  }

  if (text === "📋 Мої задачі") {
    bot.chatState[chatId] = null;
    return listTasks(bot, msg);
  }

  if (text === "🗑 Очистити все") {
    bot.chatState[chatId] = null;
    return bot.sendMessage(chatId, "❌ Скоро буде 😄");
  }
});

console.log("✅ Bot is running...");
