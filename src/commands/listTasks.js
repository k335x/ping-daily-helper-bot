import { db } from "../db.js";

export async function listTasks(bot, msg) {
  const chatId = msg.chat.id;

  const tasksRef = db
    .collection("users")
    .doc(String(chatId))
    .collection("tasks");

  const snapshot = await tasksRef.get();

  if (snapshot.empty) {
    return bot.sendMessage(chatId, "📭 У тебе ще немає задач");
  }

  for (let doc of snapshot.docs) {
    const task = doc.data();
    const taskId = doc.id;

    const buttons = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: task.done ? "✅ Виконано" : "☑️ Готово", callback_data: `done_${taskId}` },
            { text: "🗑 Видалити", callback_data: `delete_${taskId}` }
          ]
        ]
      }
    };

    const text = task.done
      ? `✅ ~~${task.text}~~`
      : `📌 ${task.text}`;

    await bot.sendMessage(chatId, text, buttons);
  }
}
