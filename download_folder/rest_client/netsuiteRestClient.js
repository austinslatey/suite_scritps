import axios from 'axios';
import crypto from 'crypto';
import OAuth from 'oauth-1.0a';

const netsuiteRequest = async ({ method, data, params }) => {
     // e.g. /app/site/hosting/restlet.nl
    const baseUrl = process.env.NETSUITE_DOWNLOAD_RESTLET_URL.split('?')[0];
    const scriptDeploy = new URLSearchParams(process.env.NETSUITE_DOWNLOAD_RESTLET_URL.split('?')[1]);

    // Build full URL 
    const urlObj = new URL(baseUrl, 'https://' + process.env.NETSUITE_ACCOUNT_ID + '.restlets.api.netsuite.com');
    scriptDeploy.forEach((v, k) => urlObj.searchParams.set(k, v));
    if (params) {
        Object.entries(params).forEach(([k, v]) => urlObj.searchParams.set(k, v));
    }
    const fullUrl = urlObj.toString();

    const oauth = OAuth({
        consumer: {
            key: process.env.NETSUITE_CONSUMER_KEY,
            secret: process.env.NETSUITE_CONSUMER_SECRET,
        },
        signature_method: 'HMAC-SHA256',
        hash_function: (base, key) => crypto.createHmac('sha256', key).update(base).digest('base64')
    });

    const token = {
        key: process.env.NETSUITE_TOKEN_ID,
        secret: process.env.NETSUITE_TOKEN_SECRET,
    };

    const requestData = { url: fullUrl, method: method.toUpperCase() };
    const authHeader = oauth.toHeader(oauth.authorize(requestData, token)).Authorization;
    const finalAuth = `${authHeader}, realm="${process.env.NETSUITE_ACCOUNT_ID}"`;

    const config = {
        method: method.toUpperCase(),
        url: fullUrl,
        headers: {
            'Authorization': finalAuth,
            'Content-Type': 'application/json'
        },
        data: data,
        timeout: 30000
    };

    const response = await axios(config);
    return response.data;
};

export { netsuiteRequest };