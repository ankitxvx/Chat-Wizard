const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Message = require('./models/Message');
const ws = require('ws');
const fs = require('fs');
const path = require('path');

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(cookieParser());

const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};

app.use(cors(corsOptions));

// Database Connection
mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Failed to connect to MongoDB:', err));

// Helper function to get user data from request
async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, (err, userData) => {
        if (err) reject('Invalid token');
        resolve(userData);
      });
    } else {
      reject('No token provided');
    }
  });
}

// Routes
app.get('/test', (req, res) => {
  res.json('test ok');
});

app.get('/messages/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
      sender: { $in: [userId, ourUserId] },
      recipient: { $in: [userId, ourUserId] },
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(401).json('Unauthorized');
  }
});

app.get('/people', async (req, res) => {
  try {
    const users = await User.find({}, { '_id': 1, username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json('Server error');
  }
});

app.get('/profile', async (req, res) => {
  try {
    const userData = await getUserDataFromRequest(req);
    res.json(userData);
  } catch (err) {
    res.status(401).json('Unauthorized');
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const foundUser = await User.findOne({ username });
    if (foundUser && bcrypt.compareSync(password, foundUser.password)) {
      jwt.sign({ userId: foundUser._id, username }, jwtSecret, {}, (err, token) => {
        if (err) return res.status(500).json('Token generation failed');
        res.cookie('token', token, { sameSite: 'none', secure: true }).json({ id: foundUser._id });
      });
    } else {
      res.status(400).json('Invalid credentials');
    }
  } catch (err) {
    res.status(500).json('Server error');
  }
});

app.post('/logout', (req, res) => {
  res.cookie('token', '', { sameSite: 'none', secure: true }).json('ok');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({ username, password: hashedPassword });
    jwt.sign({ userId: createdUser._id, username }, jwtSecret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token, { sameSite: 'none', secure: true }).status(201).json({ id: createdUser._id });
    });
  } catch (err) {
    res.status(500).json('Server error');
  }
});

// Start Server
const server = app.listen(8855, () => {
  console.log('Server is running on port 8855');
});

// WebSocket Server
const wss = new ws.Server({ server });

wss.on('connection', (connection, req) => {
  connection.isAlive = true;

  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies.split(';').find(str => str.trim().startsWith('token='));
    if (tokenCookieString) {
      const token = tokenCookieString.split('=')[1];
      jwt.verify(token, jwtSecret, (err, userData) => {
        if (!err) {
          const { userId, username } = userData;
          connection.userId = userId;
          connection.username = username;
        }
      });
    }
  }

  function notifyAboutOnlinePeople() {
    const onlinePeople = [...wss.clients].map(c => ({ userId: c.userId, username: c.username }));
    wss.clients.forEach(client => client.send(JSON.stringify({ online: onlinePeople })));
  }

  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
    }, 1000);
  }, 5000);

  connection.on('pong', () => clearTimeout(connection.deathTimer));

  connection.on('message', async (message) => {
    const messageData = JSON.parse(message);
    const { recipient, text, file } = messageData;

    let filename = null;
    if (file) {
      const parts = file.name.split('.');
      const ext = parts[parts.length - 1];
      filename = `${Date.now()}.${ext}`;
      const filePath = path.join(__dirname, 'uploads', filename);
      const bufferData = Buffer.from(file.data.split(',')[1], 'base64');
      fs.writeFile(filePath, bufferData, (err) => {
        if (err) console.error('File saving error:', err);
      });
    }

    if (recipient && (text || file)) {
      const messageDoc = await Message.create({
        sender: connection.userId,
        recipient,
        text,
        file: filename,
      });

      wss.clients.forEach(client => {
        if (client.userId === recipient) {
          client.send(JSON.stringify({
            text,
            sender: connection.userId,
            recipient,
            file: filename,
            _id: messageDoc._id,
          }));
        }
      });
    }
  });

  notifyAboutOnlinePeople();
});
