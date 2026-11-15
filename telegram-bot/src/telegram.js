const API_ROOT = 'https://api.telegram.org';

/**
 * Minimal Telegram Bot API client. Long polling means the bot needs no public
 * URL, so the same code runs on a laptop, a VPS or any Node host.
 */
export function createTelegram({ token, log, fetchImpl = fetch }) {
  const base = `${API_ROOT}/bot${token}`;

  async function call(method, payload = {}, { timeoutMs = 20_000 } = {}) {
    const response = await fetchImpl(`${base}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs)
    });

    const data = await response.json().catch(() => ({}));
    if (!data?.ok) {
      const error = new Error(data?.description || `Telegram ${method} failed (${response.status})`);
      error.status = response.status;
      error.code = data?.error_code;
      error.retryAfter = data?.parameters?.retry_after;
      throw error;
    }
    return data.result;
  }

  async function sendMessage(chatId, text, { markup, preview = false } = {}) {
    const body = String(text || '').trim();
    if (!body) return null;

    const payload = {
      chat_id: chatId,
      text: body.slice(0, 4096),
      disable_web_page_preview: !preview
    };
    if (markup) payload.reply_markup = markup;
    return call('sendMessage', payload);
  }

  return {
    call,
    getMe: () => call('getMe'),
    getUpdates: ({ offset = 0, timeoutSeconds = 30 } = {}) =>
      call(
        'getUpdates',
        { offset, timeout: timeoutSeconds, allowed_updates: ['message'] },
        { timeoutMs: (timeoutSeconds + 15) * 1000 }
      ),
    sendMessage,
    sendChatAction: (chatId, action = 'typing') =>
      call('sendChatAction', { chat_id: chatId, action }).catch((error) => {
        log?.debug('sendChatAction failed', error.message);
        return null;
      }),
    setMyCommands: (commands) => call('setMyCommands', { commands })
  };
}

/** Keyboard with a button that shares the user's own verified number. */
export function contactKeyboard() {
  return {
    keyboard: [[{ text: 'Share my number', request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true
  };
}

export function removeKeyboard() {
  return { remove_keyboard: true };
}

/** Telegram rejects messages over 4096 characters, so split on line breaks. */
export function splitMessage(text, limit = 4000) {
  const source = String(text || '');
  if (source.length <= limit) return [source];

  const chunks = [];
  let current = '';

  for (const line of source.split('\n')) {
    let rest = line;
    while (rest.length > limit) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      chunks.push(rest.slice(0, limit));
      rest = rest.slice(limit);
    }

    const candidate = current ? `${current}\n${rest}` : rest;
    if (candidate.length > limit) {
      chunks.push(current);
      current = rest;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}
