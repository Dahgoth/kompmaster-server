const express = require("express");
const multer = require("multer");
const { requireAuth, requireRole, requireAdminPanelSession } = require("../middleware/auth");
const { uploadBuffer } = require("../utils/storage");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\/(png|jpeg|webp)$/.test(file.mimetype)) {
      return cb(new Error("Разрешены только PNG, JPEG, WEBP"));
    }
    cb(null, true);
  },
});

// folder: products | categories | reviews — как в исходном ТЗ автопоиска фото.
router.post(
  "/:folder",
  requireAuth,
  requireRole(["admin"]),
  requireAdminPanelSession,
  upload.single("file"),
  async (req, res) => {
    const folder = req.params.folder;
    if (!["products", "categories", "reviews"].includes(folder)) {
      return res.status(400).json({ error: "Неизвестный раздел загрузки" });
    }
    if (!req.file) return res.status(400).json({ error: "Файл не передан" });
    try {
      const url = await uploadBuffer(req.file.buffer, folder, req.file.mimetype);
      res.json({ url });
    } catch (err) {
      console.error("[uploads] ошибка загрузки в хранилище:", err);
      res.status(500).json({ error: "Не удалось загрузить файл в хранилище" });
    }
  }
);

module.exports = router;
