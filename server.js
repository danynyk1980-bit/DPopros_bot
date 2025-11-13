const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const app = express();

// Настройки
const BOT_TOKEN = process.env.BOT_TOKEN || '8522435371:AAGJhzVYjKlXmOCKeDHx0EP_RSiso0Rt_Zc';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '129488879';

const bot = new TelegramBot(BOT_TOKEN);

// База мероприятий (можно расширять)
const events = {
  'pr_elka': '🎄 PR-Ёлка 2025',
  'business_breakfast': '🍳 Деловой завтрак коммерческая недвижимость 13 ноября',
  'conference': '🏢 Юридический форум 20 ноября',
};

// Хранилище ответов (в памяти)
let userResponses = {};

// Автопинг чтобы Render не усыплял бота
setInterval(() => {
  console.log('✅ Keep-alive:', new Date().toLocaleString('ru-RU'));
}, 10 * 60 * 1000);

// Команда /start - сразу показываем кнопку "Начать"
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  
  const startMessage = `👋 *Добро пожаловать!*`;

  userResponses[chatId] = { step: 'start' };

  bot.sendMessage(chatId, startMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 Начать', callback_data: 'show_thanks' }]
      ]
    }
  });
});

// Начало опроса
bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const data = callbackQuery.data;

  if (data === 'show_thanks') {
    // Показываем благодарность и выбор действия
    showThanksMessage(chatId, msg.message_id);
  } else if (data === 'start_survey') {
    // Выбор мероприятия
    showEventSelection(chatId, msg.message_id);
  } else if (data === 'rate_another') {
    // Оценить другое мероприятие
    showEventSelection(chatId, msg.message_id);
  } else if (data.startsWith('event_')) {
    const eventKey = data.replace('event_', '');
    userResponses[chatId].event = events[eventKey];
    userResponses[chatId].step = 'question_1';
    
    askQuestion1(chatId, msg.message_id);
  } else if (data.startsWith('rating_')) {
    handleRatingAnswer(callbackQuery);
  } else if (data === 'back_to_thanks') {
    // Назад к благодарности
    showThanksMessage(chatId, msg.message_id);
  }
});

// Показ сообщения с благодарностью и выбором действия
function showThanksMessage(chatId, messageId) {
  const thanksText = `🙏 *Спасибо за посещение мероприятия "Делового Петербурга"!*\n\nНам очень важна ваша обратная связь для улучшения наших событий.\n\nПожалуйста, пройдите небольшой опрос. Он полностью анонимный и займет не более 2-3 минут.`;

  userResponses[chatId] = { step: 'thanks' };

  bot.editMessageText(thanksText, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📝 Оценить мероприятие', callback_data: 'start_survey' }],
        [{ text: '🚀 Посмотреть все мероприятия "Делового Петербурга"', url: 'https://adv.dp.ru/events?utm_source=botopros&utm_medium=cpc&utm_campaign=botopros' }]
      ]
    }
  });
}

// Показ выбора мероприятия
function showEventSelection(chatId, messageId) {
  const eventButtons = Object.entries(events).map(([key, name]) => {
    return [{ text: name, callback_data: `event_${key}` }];
  });

  // Добавляем кнопку "Назад"
  eventButtons.push([{ text: '⬅️ Назад', callback_data: 'back_to_thanks' }]);

  bot.editMessageText(
    `📅 *О каком мероприятии вы хотите оставить отзыв?*\n\nВыберите из списка:`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: eventButtons }
    }
  );
}

// Вопрос 1: Полезность информации
function askQuestion1(chatId, messageId) {
  const ratingButtons = [];
  for (let i = 0; i <= 10; i += 2) {
    ratingButtons.push([
      { text: `${i}`, callback_data: `rating_1_${i}` }
    ]);
  }

  // Добавляем кнопку "Назад"
  ratingButtons.push([{ text: '⬅️ Назад к выбору мероприятия', callback_data: 'back_to_events' }]);

  bot.editMessageText(
    `1/3 📊 *Оцените, насколько была полезной для вас информация на мероприятии?*\n\n*0* - ничего полезного\n*10* - максимально прикладная`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: ratingButtons }
    }
  );
}

// Вопрос 2: Вероятность повторного посещения
function askQuestion2(chatId, messageId) {
  const ratingButtons = [];
  for (let i = 0; i <= 10; i += 2) {
    ratingButtons.push([
      { text: `${i}`, callback_data: `rating_2_${i}` }
    ]);
  }

  // Добавляем кнопку "Назад"
  ratingButtons.push([{ text: '⬅️ Назад', callback_data: 'back_to_question_1' }]);

  bot.editMessageText(
    `2/3 🔄 *Посетите ли вы повторно подобное мероприятие, если мы будем проводить его через 3-4 месяца?*\n\n*0* - точно не пойду\n*10* - обязательно пойду`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: ratingButtons }
    }
  );
}

// Вопрос 3: Открытый вопрос
function askQuestion3(chatId, messageId) {
  bot.editMessageText(
    `3/3 💡 *Как вы считаете, какие вопросы/темы нужно осветить подробнее или дополнительно? Что в данном формате встреч можно улучшить?*\n\nНапишите ваш ответ текстом:`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: { 
        inline_keyboard: [
          [{ text: '⬅️ Назад', callback_data: 'back_to_question_2' }],
          [{ text: '⏭️ Пропустить вопрос', callback_data: 'skip_question_3' }]
        ]
      }
    }
  );
  
  userResponses[chatId].step = 'question_3';
}

// Обработка кнопки "Пропустить вопрос"
bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const data = callbackQuery.data;

  if (data === 'skip_question_3') {
    const user = userResponses[chatId];
    if (user && user.step === 'question_3') {
      user.suggestions = 'Пропущено';
      user.step = 'completed';
      
      // Отправляем результаты
      sendResultsToAdmin(chatId, user);
      
      // Благодарим пользователя и показываем финальные кнопки
      showFinalThanks(chatId);
      
      // Очищаем данные пользователя
      delete userResponses[chatId];
    }
  }
});

// Финальное сообщение с благодарностью и кнопками
function showFinalThanks(chatId) {
  const finalText = `✅ *Спасибо за ваши ответы!*\n\nВаше мнение очень важно для нас и поможет сделать наши мероприятия еще лучше!\n\nЖдем вас на следующих событиях "Делового Петербурга"! 🎉`;

  bot.sendMessage(chatId, finalText, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '📝 Оценить другое мероприятие', callback_data: 'rate_another' }],
        [{ text: '🚀 Посмотреть все мероприятия "Делового Петербурга"', url: 'https://adv.dp.ru/events?utm_source=botopros&utm_medium=cpc&utm_campaign=botopros' }]
      ]
    }
  });
}

// Обработка навигации назад
bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const data = callbackQuery.data;
  const user = userResponses[chatId];

  if (data === 'back_to_events' && user) {
    user.step = 'select_event';
    showEventSelection(chatId, msg.message_id);
  } else if (data === 'back_to_question_1' && user) {
    user.step = 'question_1';
    askQuestion1(chatId, msg.message_id);
  } else if (data === 'back_to_question_2' && user) {
    user.step = 'question_2';
    askQuestion2(chatId, msg.message_id);
  }
});

// Обработка рейтинговых ответов
function handleRatingAnswer(callbackQuery) {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const [_, questionNum, rating] = callbackQuery.data.split('_');

  if (!userResponses[chatId]) return;

  if (questionNum === '1') {
    userResponses[chatId].usefulness = parseInt(rating);
    userResponses[chatId].step = 'question_2';
    askQuestion2(chatId, msg.message_id);
  } else if (questionNum === '2') {
    userResponses[chatId].repeat = parseInt(rating);
    userResponses[chatId].step = 'question_3';
    askQuestion3(chatId, msg.message_id);
  }
}

// Обработка текстовых ответов (вопрос 3)
bot.on('message', (msg) => {
  if (msg.text && msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const user = userResponses[chatId];

  if (user && user.step === 'question_3') {
    user.suggestions = msg.text;
    user.step = 'completed';
    
    // Отправляем результаты
    sendResultsToAdmin(chatId, user);
    
    // Благодарим пользователя и показываем финальные кнопки
    showFinalThanks(chatId);
    
    // Очищаем данные пользователя
    delete userResponses[chatId];
  }
});

// Отправка результатов администратору
function sendResultsToAdmin(chatId, responses) {
  const adminMessage = `📊 *НОВЫЙ ОТЗЫВ О МЕРОПРИЯТИИ*\n\n` +
    `🎯 *Мероприятие:* ${responses.event}\n` +
    `📈 *Полезность информации:* ${responses.usefulness}/10\n` +
    `🔄 *Вероятность повторного посещения:* ${responses.repeat}/10\n` +
    `💡 *Предложения:* ${responses.suggestions || 'Не указано'}\n` +
    `⏰ *Время опроса:* ${new Date().toLocaleString('ru-RU')}`;

  bot.sendMessage(ADMIN_CHAT_ID, adminMessage, {
    parse_mode: 'Markdown'
  });
}

// Веб-сервер
app.use(express.json());
app.get('/', (req, res) => {
  console.log('🏓 Ping received:', new Date().toLocaleString('ru-RU'));
  res.send('📊 Survey Bot is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Survey Bot server started on port ${PORT}`);
  bot.startPolling().then(() => {
    console.log('✅ Bot polling started successfully');
  });
});
