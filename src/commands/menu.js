export function showMenu(bot, msg) {
  const chatId = msg.chat.id;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "➕ Додати задачу", callback_data: "add_task" }],
        [{ text: "📋 Мої задачі", callback_data: "list_tasks" }],
        [{ text: "🗑 Очистити все", callback_data: "clear_all" }],
      ],
    },
  };

  bot.sendMessage(chatId, "📌 Обери дію:", options);
}
