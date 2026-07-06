import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';

// Search users to add as friends
export const searchUsers = async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query) {
      return res.json([]);
    }

    // Find users whose username or email contains query, excluding current user
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    }).select('-password');

    // For each found user, determine if there is an existing friendship/request status
    const usersWithStatus = await Promise.all(
      users.map(async (u) => {
        const reqExist = await FriendRequest.findOne({
          $or: [
            { sender: req.user._id, receiver: u._id },
            { sender: u._id, receiver: req.user._id },
          ],
        });

        let status = 'none'; // 'none', 'pending_sent', 'pending_received', 'accepted'
        if (reqExist) {
          if (reqExist.status === 'accepted') {
            status = 'accepted';
          } else if (reqExist.status === 'pending') {
            if (reqExist.sender.toString() === req.user._id.toString()) {
              status = 'pending_sent';
            } else {
              status = 'pending_received';
            }
          }
        }

        return {
          _id: u._id,
          username: u.username,
          email: u.email,
          avatar: u.avatar,
          bio: u.bio,
          location: u.location,
          friendshipStatus: status,
          requestId: reqExist ? reqExist._id : null,
        };
      })
    );

    res.json(usersWithStatus);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error searching users' });
  }
};

// Send a friend request
export const sendFriendRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver ID is required' });
    }

    if (receiverId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot friend request yourself' });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Check if request already exists
    const existing = await FriendRequest.findOne({
      $or: [
        { sender: req.user._id, receiver: receiverId },
        { sender: receiverId, receiver: req.user._id },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ message: 'Already friends' });
      }
      return res.status(400).json({ message: 'Friend request already exists' });
    }

    const request = await FriendRequest.create({
      sender: req.user._id,
      receiver: receiverId,
      status: 'pending',
    });

    // Populate sender info
    const populated = await FriendRequest.findById(request._id)
      .populate('sender', 'username email avatar')
      .populate('receiver', 'username email avatar');

    // Socket.io real-time emit
    const io = req.app.get('socketio');
    const userSockets = req.app.get('userSockets');
    if (io && userSockets) {
      const receiverSocketId = userSockets.get(receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('friendRequestReceived', populated);
      }
    }

    res.status(201).json(populated);
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ message: 'Server error sending request' });
  }
};

// Accept a friend request
export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Make sure request is pending and receiver is the current user
    if (request.receiver.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to accept this request' });
    }

    request.status = 'accepted';
    await request.save();

    // Socket.io real-time emit to notify both users
    const io = req.app.get('socketio');
    const userSockets = req.app.get('userSockets');
    if (io && userSockets) {
      const senderSocketId = userSockets.get(request.sender.toString());
      const receiverSocketId = userSockets.get(request.receiver.toString());
      if (senderSocketId) io.to(senderSocketId).emit('friendRequestAccepted', { requestId: request._id, sender: request.sender, receiver: request.receiver });
      if (receiverSocketId) io.to(receiverSocketId).emit('friendRequestAccepted', { requestId: request._id, sender: request.sender, receiver: request.receiver });
    }

    res.json({ message: 'Friend request accepted', requestId: request._id });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ message: 'Server error accepting request' });
  }
};

// Decline or cancel a friend request
export const declineFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Authorized if sender (cancel request) or receiver (decline request)
    if (
      request.sender.toString() !== req.user._id.toString() &&
      request.receiver.toString() !== req.user._id.toString()
    ) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await FriendRequest.findByIdAndDelete(requestId);
    
    // Socket.io real-time emit
    const io = req.app.get('socketio');
    const userSockets = req.app.get('userSockets');
    if (io && userSockets) {
      const senderSocketId = userSockets.get(request.sender.toString());
      const receiverSocketId = userSockets.get(request.receiver.toString());
      if (senderSocketId) io.to(senderSocketId).emit('friendRequestDeclined', { requestId });
      if (receiverSocketId) io.to(receiverSocketId).emit('friendRequestDeclined', { requestId });
    }

    res.json({ message: 'Friend request declined/cancelled', requestId });
  } catch (error) {
    console.error('Decline request error:', error);
    res.status(500).json({ message: 'Server error declining request' });
  }
};

// List all accepted friends
export const getFriends = async (req, res) => {
  try {
    const friendships = await FriendRequest.find({
      status: 'accepted',
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    }).populate('sender receiver', 'username email avatar bio location currentFocus toolkit');

    const friends = friendships.map((f) => {
      // Return the other user
      if (f.sender._id.toString() === req.user._id.toString()) {
        return f.receiver;
      } else {
        return f.sender;
      }
    });

    res.json(friends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ message: 'Server error loading friends' });
  }
};

// Get pending request details (incoming + outgoing)
export const getPendingRequests = async (req, res) => {
  try {
    const incoming = await FriendRequest.find({
      receiver: req.user._id,
      status: 'pending',
    }).populate('sender', 'username email avatar bio location');

    const outgoing = await FriendRequest.find({
      sender: req.user._id,
      status: 'pending',
    }).populate('receiver', 'username email avatar bio location');

    res.json({ incoming, outgoing });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ message: 'Server error loading pending requests' });
  }
};
