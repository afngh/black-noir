import express from 'express';
import chatController from '../controllers/chatController.js';
import authorize from '../middleware/auth.js';

const router = express.Router();

// Maps to POST /v1/chat/completions (Secured by API Key)
router.post('/completions', authorize, (req, res, next) => {
  chatController.createChatCompletion(req, res, next);
});

export default router;
