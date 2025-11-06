import axios from 'axios';
import crypto from 'crypto';
import OAuth from 'oauth-1.0a';

const {
    NETSUITE_ACCOUNT_ID,
    NETSUITE_CONSUMER_KEY,
    NETSUITE_CONSUMER_SECRET,
    NETSUITE_TOKEN_ID,
    NETSUITE_TOKEN_SECRET,
} = process.env;

/**
 * Generates OAuth 1.0a signed headers for NetSuite REST API calls
 */
function getAuthHeader(url, method = 'GET') {
    const oauth = OAuth({
        consumer: {
            key: NETSUITE_CONSUMER_KEY,
            secret: NETSUITE_CONSUMER_SECRET,
        },
        signature_method: 'HMAC-SHA256',
        hash_function(baseString, key) {
            return crypto.createHmac('sha256', key).update(baseString).digest('base64');
        },
    });

    const token = {
        key: NETSUITE_TOKEN_ID,
        secret: NETSUITE_TOKEN_SECRET,
    };

    const requestData = { url, method };
    const oauthHeader = oauth.toHeader(oauth.authorize(requestData, token));
    oauthHeader.Authorization += `, realm="${NETSUITE_ACCOUNT_ID}"`;
    return oauthHeader;
}

/**
 * Performs a signed REST request to NetSuite
 */
async function netsuiteRequest({ method = 'GET', path, params, data, responseType = 'json' }) {
    if (!path.startsWith('/')) path = `/${path}`;

    const baseUrl = `https://${NETSUITE_ACCOUNT_ID}.suitetalk.api.netsuite.com/services/rest`;
    const url = `${baseUrl}${path}`;
    const headers = {
        ...getAuthHeader(url, method),
        'Content-Type': 'application/json',
    };

    try {
        const res = await axios({ url, method, params, data, headers, responseType });
        return res.data;
    } catch (err) {
        console.error('NetSuite REST Error:', {
            status: err.response?.status,
            data: err.response?.data,
            message: err.message,
        });
        throw new Error(err.response?.data?.title || err.message);
    }
}

export { netsuiteRequest };
