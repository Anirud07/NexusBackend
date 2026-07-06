import express from 'express';
import {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriends,
  getPendingRequests,
} from '../controllers/friendController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/search', searchUsers);
router.post('/request', sendFriendRequest);
router.put('/request/:requestId/accept', acceptFriendRequest);
router.delete('/request/:requestId/decline', declineFriendRequest);
router.get('/list', getFriends);
router.get('/pending', getPendingRequests);

export default router;
