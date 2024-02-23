// 引入所需模块
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const Web3 = require('web3');
const dotenv = require('dotenv');

// 初始化 dotenv
dotenv.config();

// 连接到 MongoDB 数据库
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// 初始化 Express 应用
const app = express();
app.use(bodyParser.json());

// 初始化 Web3
const web3 = new Web3(process.env.INFURA_URL);

// 用户模型（示例）
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  password: String,
  ethAddress: String,
}));

// 中间件：验证 JWT
const verifyToken = (req, res, next) => {
  const token = req.headers['x-access-token'];
  if (!token) return res.status(403).send({ message: 'No token provided.' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(500).send({ message: 'Failed to authenticate token.' });
    req.userId = decoded.id;
    next();
  });
};

// 注册新用户
app.post('/register', async (req, res) => {
  const { username, password, ethAddress } = req.body;
  const newUser = new User({ username, password, ethAddress });
  try {
    await newUser.save();
    res.send({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// 用户登录
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || user.password !== password) {
      return res.status(401).send({ message: 'Invalid username or password' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: 86400 // 24 hours
    });
    res.send({ accessToken: token });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// 受保护的路由示例
app.get('/protected', verifyToken, (req, res) => {
  res.status(200).send({ message: 'Welcome to the protected route!' });
});

// 获取以太坊账户余额
app.get('/eth-balance/:address', async (req, res) => {
  const { address } = req.params;
  try {
    const balance = await web3.eth.getBalance(address);
    res.send({ balance: web3.utils.fromWei(balance, 'ether') });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
