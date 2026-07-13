const router = require('express').Router();
const pool   = require('../config/db');

// Adobe Sign sends a verification challenge on webhook setup
router.get('/', (req, res) => {
  const challenge = req.query['xAdobeSignClientId'];
  if (challenge) {
    res.set('x-adobesign-clientid', challenge);
    return res.send(challenge);
  }
  res.sendStatus(200);
});

// Receive signing events from Adobe Sign
router.post('/', async (req, res) => {
  try {
    const event = req.body;
    const agreementId = event?.agreement?.id;
    const status      = event?.agreement?.status;

    if (!agreementId) return res.sendStatus(200);

    const statusMap = {
      SIGNED:    'SIGNED',
      CANCELLED: 'CANCELLED',
      DECLINED:  'DECLINED',
      EXPIRED:   'EXPIRED',
      RECALLED:  'RECALLED',
    };

    const newStatus = statusMap[status] || status || 'UNKNOWN';

    if (status === 'SIGNED') {
      await pool.query(
        `UPDATE adobe_agreements SET status=$1, signed_at=NOW() WHERE adobe_agreement_id=$2`,
        [newStatus, agreementId]
      );
    } else {
      await pool.query(
        `UPDATE adobe_agreements SET status=$1 WHERE adobe_agreement_id=$2`,
        [newStatus, agreementId]
      );
    }

    console.log(`[Adobe Sign] Agreement ${agreementId} updated to ${newStatus}`);
    res.sendStatus(200);
  } catch (err) {
    console.error('[Adobe Sign webhook]', err);
    res.sendStatus(200); // Always 200 to Adobe
  }
});

module.exports = router;
