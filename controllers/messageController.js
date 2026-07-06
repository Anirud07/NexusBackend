import Message from '../models/Message.js';
import FriendRequest from '../models/FriendRequest.js';

// Send a private one-to-one message
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, text, attachment } = req.body;

    if (!receiverId || !text) {
      return res.status(400).json({ message: 'Receiver ID and text are required' });
    }

    // Verify they are actually friends
    const isFriend = await FriendRequest.findOne({
      status: 'accepted',
      $or: [
        { sender: req.user._id, receiver: receiverId },
        { sender: receiverId, receiver: req.user._id },
      ],
    });

    if (!isFriend) {
      return res.status(400).json({ message: 'You can only message accepted friends' });
    }

    const message = await Message.create({
      sender: req.user._id,
      receiver: receiverId,
      text,
      attachment: attachment || '',
    });

    // Populate sender info
    const populated = await Message.findById(message._id)
      .populate('sender', 'username email avatar')
      .populate('receiver', 'username email avatar');

    // Socket.io real-time emit
    const io = req.app.get('socketio');
    const userSockets = req.app.get('userSockets'); // Map of userId -> socket.id

    if (io && userSockets) {
      const recipientSocketId = userSockets.get(receiverId.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('newMessage', populated);
      }
    }

    res.status(201).json(populated);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error sending message' });
  }
};

// Retrieve message history with a friend
export const getMessages = async (req, res) => {
  try {
    const { friendId } = req.params;

    // Verify friendship
    const isFriend = await FriendRequest.findOne({
      status: 'accepted',
      $or: [
        { sender: req.user._id, receiver: friendId },
        { sender: friendId, receiver: req.user._id },
      ],
    });

    if (!isFriend) {
      return res.status(400).json({ message: 'You can only view messages of accepted friends' });
    }

    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: friendId },
        { sender: friendId, receiver: req.user._id },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'username email avatar')
      .populate('receiver', 'username email avatar');

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error loading messages' });
  }
};
