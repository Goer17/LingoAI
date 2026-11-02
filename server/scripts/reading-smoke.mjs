/**
 * Minimal CDP smoke test for the Reading page. No puppeteer: drive headless
 * Chrome over the DevTools protocol with Node's built-in WebSocket.
 *
 * Usage: node server/scripts/reading-smoke.mjs <baseUrl> <accessToken>
 */
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:3210';
const token = process.argv[3] ?? '';
const port = 9333;

const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=${port}`,
  '--window-size=1600,1000',
  `--user-data-dir=/tmp/chrome-reading-smoke-${Date.now()}`,
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

let chromeLog = '';
chrome.stderr.on('data', (chunk) => {
  chromeLog += chunk.toString();
});

async function waitForTarget() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === 'page');
      if (page?.webSocketDebuggerUrl) {
        return page.webSocketDebuggerUrl;
      }
    } catch {
      // Chrome is still starting.
    }
    await delay(250);
  }
  throw new Error(`Chrome did not expose a page target.\n${chromeLog}`);
}

const wsUrl = await waitForTarget();
const socket = new WebSocket(wsUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const consoleErrors = [];
const pageErrors = [];

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message);
    pending.delete(message.id);
    return;
  }
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    consoleErrors.push(message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' '));
  }
  if (message.method === 'Runtime.exceptionThrown') {
    pageErrors.push(message.params.exceptionDetails.text
      + (message.params.exceptionDetails.exception?.description ?? ''));
  }
});

function send(method, params = {}) {
  const id = nextId;
  nextId += 1;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, (message) => {
      if (message.error) {
        reject(new Error(`${method}: ${message.error.message}`));
      } else {
        resolve(message.result);
      }
    });
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text
      + (result.exceptionDetails.exception?.description ?? ''));
  }
  return result.result.value;
}

await send('Runtime.enable');
await send('Page.enable');
// Headless pages start unfocused, and an unfocused page drops programmatic
// text selections, which would make the highlight flow untestable.
await send('Page.bringToFront');
await send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});

// Seed the access token, then load the app.
await send('Page.navigate', { url: `${baseUrl}/login` });
await delay(1500);
await evaluate(`window.localStorage.setItem('lingoai-access-token', ${JSON.stringify(token)})`);
await send('Page.navigate', { url: `${baseUrl}/reading` });
await delay(4000);

const report = await evaluate(`(() => {
  const text = (selector) => document.querySelector(selector)?.textContent?.trim() ?? null;
  const panes = {
    library: Boolean(document.querySelector('.reading-library')),
    document: Boolean(document.querySelector('.reading-document')),
    rail: Boolean(document.querySelector('.reading-rail')),
    chat: Boolean(document.querySelector('.reading-chat')),
  };
  const links = [...document.querySelectorAll('.nav-links .nav-link')].map((node) => node.textContent.trim());
  return {
    panes,
    navLinks: links,
    heading: text('.reading-document h2'),
    paragraphs: document.querySelectorAll('.reading-paragraph').length,
    marks: document.querySelectorAll('.reading-mark-card').length,
    categories: [...document.querySelectorAll('.reading-category-name')].map((node) => node.textContent.trim()),
    articles: [...document.querySelectorAll('.reading-article-title')].map((node) => node.textContent.trim()),
    bubbles: document.querySelectorAll('.reading-chat .chat-bubble').length,
    gutter: [...document.querySelectorAll('.reading-gutter')].map((node) => node.textContent.trim()).slice(0, 6),
    error: text('.reading-flash.error-text'),
    notice: text('.reading-flash.success-text'),
  };
})()`);

// Exercise the real selection path: drag across the first line of paragraph 1
// with trusted mouse input, so the page's own selection handler runs.
const dragPoints = await evaluate(`(() => {
  const paragraph = document.querySelector('[data-paragraph="1"] .reading-text');
  if (!paragraph) return null;
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  // Vue leaves empty text nodes around each segment; skip them.
  while (node && !node.textContent.trim()) {
    node = walker.nextNode();
  }
  if (!node) return null;
  const range = document.createRange();
  range.setStart(node, 0);
  range.setEnd(node, Math.min(26, node.textContent.length));
  const rects = [...range.getClientRects()].filter((rect) => rect.width > 1 && rect.height > 1);
  if (!rects.length) return null;
  const first = rects[0];
  const last = rects[rects.length - 1];
  return {
    start: { x: first.left + 2, y: first.top + first.height / 2 },
    end: { x: last.left + last.width - 2, y: last.top + last.height / 2 },
    expected: range.toString(),
  };
})()`);

const markResult = { ok: Boolean(dragPoints), expected: dragPoints?.expected ?? null };
if (dragPoints) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: dragPoints.start.x, y: dragPoints.start.y, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: dragPoints.start.x + 8, y: dragPoints.start.y, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: dragPoints.end.x, y: dragPoints.end.y, button: 'left', buttons: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: dragPoints.end.x, y: dragPoints.end.y, button: 'left', buttons: 0, clickCount: 1 });
  await delay(400);
  markResult.selected = await evaluate('window.getSelection().toString()');
}

const toolbar = await evaluate(`(() => {
  const bar = document.querySelector('.reading-selection-bar');
  return bar ? [...bar.querySelectorAll('button')].map((node) => node.textContent.trim()) : null;
})()`);

const afterHighlight = await (async () => {
  if (!toolbar) return null;
  await evaluate(`(() => {
    const bar = document.querySelector('.reading-selection-bar');
    const button = [...bar.querySelectorAll('button')].find((node) => node.textContent.includes('Highlight'));
    button.click();
  })()`);
  await delay(900);
  return evaluate(`(() => ({
    highlights: document.querySelectorAll('.mark-highlight').length,
    cards: document.querySelectorAll('.reading-mark-card').length,
    firstQuote: document.querySelector('.reading-mark-quote')?.textContent?.trim() ?? null,
  }))()`);
})();

// Drag the first mark card into the chat composer, then send a question.
const dropped = await evaluate(`(() => {
  const card = document.querySelector('.reading-mark-card');
  const chat = document.querySelector('.reading-chat');
  if (!card || !chat) return { ok: false, reason: 'missing nodes', hasCard: Boolean(card) };
  const dataTransfer = new DataTransfer();
  card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
  chat.dispatchEvent(new DragEvent('dragover', { bubbles: true, dataTransfer, cancelable: true }));
  chat.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer, cancelable: true }));
  return { ok: true, markId: card.dataset.markId ?? '' };
})()`);
await delay(400);

const chips = await evaluate(`(() => ({
  chips: document.querySelectorAll('.reading-citation-strip .reading-cite-chip').length,
  chipText: document.querySelector('.reading-citation-strip')?.textContent?.trim() ?? null,
}))()`);

let chatResult = { ...dropped, ...chips };
if (dropped?.ok) {
  await evaluate(`(() => {
    const input = document.querySelector('.reading-composer-input');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(input, 'What does this marked sentence mean? One sentence only.');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await delay(300);
  const clicked = await evaluate(`(() => {
    const button = [...document.querySelectorAll('.reading-composer-actions button')]
      .find((node) => node.textContent.trim() === 'Send');
    if (!button) return { ok: false, reason: 'no send button' };
    button.click();
    return { ok: true, disabled: button.disabled };
  })()`);
  chatResult.clicked = clicked;

  for (let attempt = 0; attempt < 90; attempt += 1) {
    await delay(1000);
    const state = await evaluate(`(() => {
      const bubbles = [...document.querySelectorAll('.reading-chat .chat-bubble')];
      const last = bubbles[bubbles.length - 1];
      return {
        bubbles: bubbles.length,
        streaming: Boolean(document.querySelector('.reading-chat .reading-chat-body .muted-text')),
        lastText: last?.textContent?.trim().slice(0, 140) ?? null,
        error: document.querySelector('.reading-flash.error-text')?.textContent?.trim() ?? null,
      };
    })()`);
    if (state.bubbles >= 2 && !state.streaming) {
      chatResult = { ...chatResult, ...state, ok: true };
      break;
    }
    chatResult = { ...chatResult, ...state };
  }
}

console.log(JSON.stringify({ report, markResult, toolbar, afterHighlight, chatResult, consoleErrors, pageErrors }, null, 2));

socket.close();
chrome.kill('SIGKILL');
process.exit(0);