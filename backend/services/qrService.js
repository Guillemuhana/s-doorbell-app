// services/qrService.js
const QRCode = require('qrcode');
const logger = require('../config/logger');

/**
 * Genera imagen QR como Data URL (base64)
 */
const generateQRDataURL = async (qrId) => {
  const url = `${process.env.VISITOR_BASE_URL}/${qrId}`;

  const options = {
    errorCorrectionLevel: 'H', // High error correction for durability
    type: 'image/png',
    quality: 0.95,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    width: 512,
  };

  try {
    const dataURL = await QRCode.toDataURL(url, options);
    logger.info(`QR generated for qrId: ${qrId}`);
    return { success: true, dataURL, url };
  } catch (error) {
    logger.error('QR generation error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Genera QR como Buffer PNG
 */
const generateQRBuffer = async (qrId) => {
  const url = `${process.env.VISITOR_BASE_URL}/${qrId}`;

  try {
    const buffer = await QRCode.toBuffer(url, {
      errorCorrectionLevel: 'H',
      width: 512,
      margin: 2,
    });
    return { success: true, buffer, url };
  } catch (error) {
    logger.error('QR buffer generation error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Genera QR como SVG string
 */
const generateQRSVG = async (qrId) => {
  const url = `${process.env.VISITOR_BASE_URL}/${qrId}`;

  try {
    const svg = await QRCode.toString(url, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2,
    });
    return { success: true, svg, url };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = { generateQRDataURL, generateQRBuffer, generateQRSVG };
