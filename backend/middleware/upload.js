// middleware/upload.js
// Almacenamiento EN MEMORIA (buffer) → se sube a Supabase Storage.
// (Serverless-friendly: no escribe en disco.)
const multer = require('multer');
const path = require('path');

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowedTypes.test(file.mimetype);
  if (extOk && mimeOk) cb(null, true);
  else cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, webp)'), false);
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 }, // 5MB
});

module.exports = upload;
