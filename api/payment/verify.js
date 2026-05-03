import crypto from 'crypto';

export const config = { runtime: 'nodejs' };

// This endpoint ONLY verifies the payment signature for the frontend to show a success screen.
// It does NOT update order status — that is exclusively handled by /api/webhook.js
// after Razorpay sends a server-to-server confirmation.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Missing payment fields' });
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(razorpay_signature, 'hex')
  );

  if (!isValid) {
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  // Signature is valid — frontend can show success screen.
  // Actual order status update happens via webhook.
  return res.json({ success: true });
}
