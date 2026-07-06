import User from '../models/User.js';
import { generateToken, clearToken } from '../middleware/auth.js';
import { z } from 'zod';

// Zod schemas for validation
const registerSchema = z.zodSchema ? z.zodSchema : z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const register = async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.errors[0].message });
    }

    const { username, email, password } = validation.data;

    // Check if user already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
    });

    if (user) {
      const token = generateToken(user._id);
      res.status(201).json({
        token,
        _id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        location: user.location,
        website: user.website,
        avatar: user.avatar,
        toolkit: user.toolkit,
        currentFocus: user.currentFocus,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const login = async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.errors[0].message });
    }

    const { email, password } = validation.data;

    const user = await User.findOne({ email });
    if (user && (await user.comparePassword(password))) {
      const token = generateToken(user._id);
      res.json({
        token,
        _id: user._id,
        username: user.username,
        email: user.email,
        bio: user.bio,
        location: user.location,
        website: user.website,
        avatar: user.avatar,
        toolkit: user.toolkit,
        currentFocus: user.currentFocus,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const logout = async (req, res) => {
  try {
    clearToken(res);
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error retrieving profile' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.username = req.body.username || user.username;
      user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
      user.location = req.body.location !== undefined ? req.body.location : user.location;
      user.website = req.body.website !== undefined ? req.body.website : user.website;
      user.avatar = req.body.avatar !== undefined ? req.body.avatar : user.avatar;
      user.currentFocus = req.body.currentFocus !== undefined ? req.body.currentFocus : user.currentFocus;
      user.toolkit = req.body.toolkit !== undefined ? req.body.toolkit : user.toolkit;

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        bio: updatedUser.bio,
        location: updatedUser.location,
        website: updatedUser.website,
        avatar: updatedUser.avatar,
        toolkit: updatedUser.toolkit,
        currentFocus: updatedUser.currentFocus,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};
