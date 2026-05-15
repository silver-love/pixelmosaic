import { Router, Request, Response } from "express";
import { cacheMosaicResult, getCachedMosaicResult } from "../redis.js";

const router = Router();

router.post("/api/cache/check", async (req: Request, res: Response) => {
  try {
    const { img1Hash, img2Hash, blockSize } = req.body;

    if (!img1Hash || !img2Hash || blockSize === undefined) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const dataUrl = await getCachedMosaicResult(img1Hash, img2Hash, blockSize);

    if (dataUrl) {
      res.json({ cached: true, dataUrl });
    } else {
      res.json({ cached: false });
    }
  } catch (err) {
    console.error("Cache check error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/cache/store", async (req: Request, res: Response) => {
  try {
    const { img1Hash, img2Hash, blockSize, dataUrl } = req.body;

    if (!img1Hash || !img2Hash || blockSize === undefined || !dataUrl) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    await cacheMosaicResult(img1Hash, img2Hash, blockSize, dataUrl);
    res.json({ success: true });
  } catch (err) {
    console.error("Cache store error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;