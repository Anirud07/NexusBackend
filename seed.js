import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Message from './models/Message.js';
import FriendRequest from './models/FriendRequest.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const seed = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected. Clearing old collections...');

    await User.deleteMany({});
    await Message.deleteMany({});
    await FriendRequest.deleteMany({});

    console.log('Creating users...');

    // Create main user (Jordan Smith)
    const jordan = await User.create({
      username: 'Jordan Smith',
      email: 'jordan@slate.chat',
      password: 'password123',
      bio: 'Product Designer & Developer. Focusing on minimal interfaces and efficient workflows.',
      location: 'San Francisco, CA',
      website: 'jsmith.design',
      currentFocus: 'Slate Design System v2',
      toolkit: ['React', 'Tailwind', 'TypeScript', 'Node.js', 'Figma'],
    });

    // Friends
    const alex = await User.create({
      username: 'Alex Rivera',
      email: 'alex@slate.chat',
      password: 'password123',
      bio: 'iOS Developer & Runner',
      location: 'New York, NY',
    });

    const sarah = await User.create({
      username: 'Sarah Chen',
      email: 'sarah@slate.chat',
      password: 'password123',
      bio: 'Systems Engineer',
      location: 'Seattle, WA',
    });

    const marcus = await User.create({
      username: 'Marcus Vane',
      email: 'marcus@slate.chat',
      password: 'password123',
      bio: 'Design Engineer',
      location: 'Austin, TX',
    });

    // Inbound Requests
    const elena = await User.create({
      username: 'Elena Rossi',
      email: 'elena@slate.chat',
      password: 'password123',
      bio: 'Product Designer',
      location: 'Rome, Italy',
    });

    const thomas = await User.create({
      username: 'Thomas Wu',
      email: 'thomas@slate.chat',
      password: 'password123',
      bio: 'Senior Architect',
      location: 'Boston, MA',
    });

    // Outbound Requests
    const liam = await User.create({
      username: 'Liam Parker',
      email: 'liam@slate.chat',
      password: 'password123',
      bio: 'Backend Engineer',
      location: 'Toronto, Canada',
    });

    const sophia = await User.create({
      username: 'Sophia Lane',
      email: 'sophia@slate.chat',
      password: 'password123',
      bio: 'Staff Designer',
      location: 'London, UK',
    });

    console.log('Establishing friend relations...');

    // Friends (Accepted state)
    await FriendRequest.create([
      { sender: jordan._id, receiver: alex._id, status: 'accepted' },
      { sender: sarah._id, receiver: jordan._id, status: 'accepted' },
      { sender: jordan._id, receiver: marcus._id, status: 'accepted' },
    ]);

    // Incoming Pending Requests
    await FriendRequest.create([
      { sender: elena._id, receiver: jordan._id, status: 'pending' },
      { sender: thomas._id, receiver: jordan._id, status: 'pending' },
    ]);

    // Outgoing Pending Requests
    await FriendRequest.create([
      { sender: jordan._id, receiver: liam._id, status: 'pending' },
      { sender: jordan._id, receiver: sophia._id, status: 'pending' },
    ]);

    console.log('Seeding conversation messages...');

    // Messages with Alex
    await Message.create([
      {
        sender: alex._id,
        receiver: jordan._id,
        text: 'Hey! Have you had a chance to look at the Slate Chat design specs?',
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
      },
      {
        sender: jordan._id,
        receiver: alex._id,
        text: 'Just finished reviewing them. The minimalist approach looks incredible. The performance focus is definitely going to set it apart.',
        createdAt: new Date(Date.now() - 1000 * 60 * 25), // 25 mins ago
      },
      {
        sender: alex._id,
        receiver: jordan._id,
        text: 'Agreed. I\'m especially happy with how the 8px grid system turned out. It feels very mathematically harmonious.',
        createdAt: new Date(Date.now() - 1000 * 60 * 20), // 20 mins ago
      },
      {
        sender: alex._id,
        receiver: jordan._id,
        text: 'I\'m working on the animation curves now. Making sure every transition feels fluid but snap-precise.',
        createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
      },
    ]);

    // Messages with Sarah
    await Message.create([
      {
        sender: sarah._id,
        receiver: jordan._id,
        text: 'The report is ready for review.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      },
    ]);

    // Messages with Marcus
    await Message.create([
      {
        sender: jordan._id,
        receiver: marcus._id,
        text: 'Let\'s hop on a call tomorrow to sync.',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      },
    ]);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
