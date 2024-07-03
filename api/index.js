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

dotenv.config();
mongoose.connect(process.env.MONGO_URL).then(() => {
  console.log("connected");
}).catch((err) => console.error(err));

const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(express.json());
app.use(cookieParser());
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};

app.use(cors(corsOptions));

async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) {
          reject(err);
        } else {
          resolve(userData);
        }
      });
    } else {
      reject('no token');
    }
  });
}
app.get('/',(req,res)=>{
  res.send("Hello World");
});
app.get('/test', (req, res) => {
  res.json('test ok');
});

app.get('/messages/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
      sender: { $in: [userId, ourUserId] },
      recipient: { $in: [userId, ourUserId] },
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

app.get('/people', async (req, res) => {
  try {
    const users = await User.find({}, { '_id': 1, username: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get users' });
  }
});

app.get('/profile', (req, res) => {
  const token = req.cookies?.token;
  if (token) {
    jwt.verify(token, jwtSecret, {}, (err, userData) => {
      if (err) {
        res.status(401).json('invalid token');
      } else {
        res.json(userData);
      }
    });
  } else {
    res.status(401).json('no token');
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const foundUser = await User.findOne({ username });
    if (foundUser) {
      const passOk = bcrypt.compareSync(password, foundUser.password);
      if (passOk) {
        jwt.sign({ userId: foundUser._id, username }, jwtSecret, {}, (err, token) => {
          if (err) {
            res.status(500).json({ error: 'Token generation failed' });
          } else {
            res.cookie('token', token, { sameSite: 'none', secure: true }).json({ id: foundUser._id });
          }
        });
      } else {
        res.status(401).json({ error: 'Invalid password' });
      }
    } else {
      res.status(401).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/logout', (req, res) => {
  res.cookie('token', '', { sameSite: 'none', secure: true }).json('ok');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({
      username,
      password: hashedPassword,
    });
    jwt.sign({ userId: createdUser._id, username }, jwtSecret, {}, (err, token) => {
      if (err) {
        res.status(500).json({ error: 'Token generation failed' });
      } else {
        res.cookie('token', token, { sameSite: 'none', secure: true }).status(201).json({ id: createdUser._id });
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

const server = app.listen(8855);

const wss = new ws.WebSocketServer({ server });
wss.on('connection', (connection, req) => {
  function notifyAboutOnlinePeople() {
    [...wss.clients].forEach(client => {
      client.send(JSON.stringify({
        online: [...wss.clients].map(c => ({ userId: c.userId, username: c.username })),
      }));
    });
  }

  connection.isAlive = true;

  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
      console.log('dead');
    }, 1000);
  }, 5000);

  connection.on('pong', () => {
    clearTimeout(connection.deathTimer);
  });

  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies.split(';').find(str => str.trim().startsWith('token='));
    if (tokenCookieString) {
      const token = tokenCookieString.split('=')[1];
      if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
          if (err) {
            console.error('JWT verification error', err);
          } else {
            const { userId, username } = userData;
            connection.userId = userId;
            connection.username = username;
          }
        });
      }
    }
  }

  connection.on('message', async (message) => {
    try {
      const messageData = JSON.parse(message.toString());
      const { recipient, text, file } = messageData;
      let filename = null;
      if (file) {
        console.log('size', file.data.length);
        const parts = file.name.split('.');
        const ext = parts[parts.length - 1];
        filename = Date.now() + '.' + ext;
        const path = __dirname + '/uploads/' + filename;
        const bufferData = Buffer.from(file.data.split(',')[1], 'base64');
        fs.writeFile(path, bufferData, (err) => {
          if (err) {
            console.error('File save error', err);
          } else {
            console.log('file saved:' + path);
          }
        });
      }
      if (recipient && (text || file)) {
        const messageDoc = await Message.create({
          sender: connection.userId,
          recipient,
          text,
          file: file ? filename : null,
        });
        console.log('created message');
        [...wss.clients]
          .filter(c => c.userId === recipient)
          .forEach(c => c.send(JSON.stringify({
            text,
            sender: connection.userId,
            recipient,
            file: file ? filename : null,
            _id: messageDoc._id,
          })));
      }
    } catch (error) {
      console.error('Message handling error', error);
    }
  });

  notifyAboutOnlinePeople();
});
