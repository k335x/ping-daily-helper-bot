import cron from "node-cron";
import { db } from "./db.js";
import { bot } from "./index.js";

cron.schedule("0 * * * * *", async () => {
  const now = new Date();

  const usersSnapshot = await db.collection("users").get();
  if (usersSnapshot.empty) return;

  for (const userDoc of usersSnapshot.docs) {
    const chatId = userDoc.id;

    const tasksSnapshot = await db
      .collection("users").doc(chatId).collection("tasks")
      .where("done", "==", false)
      .where("remindAt", "<=", now)
      .get();

    if (tasksSnapshot.empty) continue;

    for (const taskDoc of tasksSnapshot.docs) {
      const task = taskDoc.data();
      const taskId = taskDoc.id;

      if (task.lastNotifiedAt) {
        const last = task.lastNotifiedAt.toDate ? task.lastNotifiedAt.toDate() : new Date(task.lastNotifiedAt);
        if (now - last < 60 * 1000) continue;
      }

      await bot.sendMessage(chatId, `🔔 Нагадую: ${task.text}`);

      await db.collection("users").doc(chatId).collection("tasks").doc(taskId)
        .update({ done: true, lastNotifiedAt: now });
    }
  }
});
