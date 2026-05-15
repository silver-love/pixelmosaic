import { Router, Request, Response } from "express";
import { addHistoryEntry, getHistory, deleteHistoryEntry } from "../redis.js";

const router = Router();

router.get("/api/history", async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies?.sessionId;

    if (!sessionId) {
      res.json([]);
      return;
    }

    const entries = await getHistory(sessionId);
    const parsed = entries.map((entry) => JSON.parse(entry));
    res.json(parsed);
  } catch (err) {
    console.error("Get history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/history", async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies?.sessionId;

    if (!sessionId) {
      res.status(401).json({ error: "No session" });
      return;
    }

    const { thumbnail, img1Name, img2Name, blockSize, dataUrl, timestamp } =
      req.body;

    if (!thumbnail || !img1Name || !img2Name || blockSize === undefined || !dataUrl) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const entry = JSON.stringify({
      thumbnail,
      img1Name,
      img2Name,
      blockSize,
      dataUrl,
      timestamp: timestamp || Date.now(),
    });

    await addHistoryEntry(sessionId, entry);
    res.json({ success: true });
  } catch (err) {
    console.error("Add history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/api/history/:index", async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies?.sessionId;

    if (!sessionId) {
      res.status(401).json({ error: "No session" });
      return;
    }

    const index = parseInt(req.params.index as string, 10);

    if (isNaN(index) || index < 0) {
      res.status(400).json({ error: "Invalid index" });
      return;
    }

    await deleteHistoryEntry(sessionId, index);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;