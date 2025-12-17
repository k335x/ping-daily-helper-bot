import { db } from "../db.js";

export async function addTask(bot, msg, match) {
  const chatId = msg.chat.id;
  const text = match[1];

  if (!text) {
    return bot.sendMessage(chatId, "❌ Будь ласка, введи текст задачі.");
  }
є
  await db.collection("users").doc(String(chatId)).set(
    {
      createdAt: new Date(),
    },
    { merge: true }
  );

  const task = {
    text,
    done: false,
    createdAt: new Date(),
    remindType: bot.chatState?.[chatId]?.remindType || null
  };

  await db
    .collection("users")
    .doc(String(chatId))
    .collection("tasks")
    .add(task);

  bot.sendMessage(chatId, `✅ Задачу додано:\n👉 "${text}"`);

  const usersCheck = await db.collection("users").get();
  console.log("🔥 USERS IN FIRESTORE:", usersCheck.size);
}
