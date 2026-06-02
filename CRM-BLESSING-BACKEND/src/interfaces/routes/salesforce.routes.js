const express = require("express");
const axios = require("axios");
const router = express.Router();

const BASE_URL = "https://transforma.my.site.com";

router.post("/salesforce-login", async (req, res) => {
    const username = process.env.SF_USERNAME;
    const password = process.env.SF_PASSWORD;

    if (!username || !password) {
        return res.status(500).json({ error: "Faltan SF_USERNAME o SF_PASSWORD en el .env" });
    }

    try {
        const loginPageRes = await axios.get(`${BASE_URL}/s/login/`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                "Accept-Language": "es-ES,es;q=0.6",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Upgrade-Insecure-Requests": "1",
                "Sec-Fetch-Dest": "document",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Site": "none",
            },
            maxRedirects: 5,
        });

        const rawCookies = loginPageRes.headers["set-cookie"] || [];
        const cookieMap = {};
        rawCookies.forEach((c) => {
            const [pair] = c.split(";");
            const [key, ...rest] = pair.split("=");
            cookieMap[key.trim()] = rest.join("=").trim();
        });

        const fwuidMatch = loginPageRes.data.match(/"fwuid":"([^"]+)"/);
        const fwuid = fwuidMatch ? fwuidMatch[1] : null;
        if (!fwuid) return res.status(500).json({ error: "No se pudo extraer fwuid del HTML" });

        const loadedMatch = loginPageRes.data.match(/"APPLICATION@markup:\/\/siteforce:loginApp2":"([^"]+)"/);
        const loadedKey = loadedMatch ? loadedMatch[1] : null;
        if (!loadedKey) return res.status(500).json({ error: "No se pudo extraer loadedKey del HTML" });

        const cookieString = Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join("; ");

        const auraContext = JSON.stringify({
            mode: "PROD",
            fwuid: fwuid,
            app: "siteforce:loginApp2",
            loaded: { "APPLICATION@markup://siteforce:loginApp2": loadedKey },
            dn: [], globals: {}, uad: true,
        });

        const message = JSON.stringify({
            actions: [{
                id: "105;a",
                descriptor: "apex://applauncher.LoginFormController/ACTION$login",
                callingDescriptor: "markup://salesforceIdentity:loginForm2",
                params: { username, password, startUrl: "" },
                version: "66.0",
            }],
        });

        const formData = new URLSearchParams();
        formData.append("message", message);
        formData.append("aura.context", auraContext);
        formData.append("aura.pageURI", "/s/login/");
        formData.append("aura.token", "null");

        const auraRes = await axios.post(
            `${BASE_URL}/s/sfsites/aura?r=6&applauncher.LoginForm.login=1`,
            formData.toString(),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
                    "Accept": "*/*",
                    "Accept-Language": "es-ES,es;q=0.6",
                    "Accept-Encoding": "gzip, deflate, br, zstd",
                    "Origin": BASE_URL,
                    "Referer": `${BASE_URL}/s/login/`,
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                    "Cookie": cookieString,
                },
                maxRedirects: 0,
                validateStatus: (s) => s >= 200 && s < 500,
            }
        );

        const auraData = auraRes.data;
        let frontdoorUrl = null;

        if (auraData?.events) {
            for (const event of auraData.events) {
                const url = event?.attributes?.values?.url;
                if (url) { frontdoorUrl = url; break; }
            }
        }

        if (!frontdoorUrl && auraData?.actions) {
            for (const action of auraData.actions) {
                const rv = action?.returnValue;
                if (rv?.redirectUrl) { frontdoorUrl = rv.redirectUrl; break; }
                if (rv?.url) { frontdoorUrl = rv.url; break; }
                if (rv?.returnValue) { frontdoorUrl = rv.returnValue; break; }
            }
        }

        if (frontdoorUrl) {
            const fullUrl = frontdoorUrl.startsWith("http") ? frontdoorUrl : `${BASE_URL}${frontdoorUrl}`;
            return res.json({ success: true, redirectUrl: fullUrl });
        }

        return res.status(401).json({ error: "No se obtuvo URL de redirección.", debug: auraData });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
