// /netlify/functions/verify-payment.js
exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { reference } = JSON.parse(event.body);
        
        if (!reference) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Reference is required' })
            };
        }

        // Your Paystack Secret Key (LIVE)
        const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Verification error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Verification failed' })
        };
    }
};