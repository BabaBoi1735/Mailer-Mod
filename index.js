import express from 'express';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Verbonden met MongoDB'))
  .catch(err => console.error('❌ MongoDB verbinding mislukt:', err));

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  verified: Boolean,
  verifiedAt: Date
});

const User = mongoose.model('User', userSchema);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/send-verification', async (req, res) => {
  try {
    const { email, username } = req.body;

    let existing = await User.findOne({ username });
    if (!existing) {
      existing = new User({ username, email, verified: false });
      await existing.save();
    }

    const verifyLink = `https://jouw-replit-url.repl.co/verify?user=${encodeURIComponent(username)}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verifieer je moderation role',
      text: `Hoi ${username}, klik om je account te verifiëren:\n\n${verifyLink}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Mail error:', error);
        return res.status(500).send('Fout bij verzenden');
      }
      console.log('Mail verzonden:', info.response);
      res.send('Verificatiemail verzonden');
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.get('/verify', async (req, res) => {
  try {
    const { user } = req.query;
    const account = await User.findOne({ username: user });
    if (!account) return res.send('❌ Gebruiker niet gevonden');

    account.verified = true;
    account.verifiedAt = new Date();
    await account.save();

    res.render('verified', { username: user });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

app.get('/is-verified/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    res.json({ verified: user?.verified || false });
  } catch (error) {
    console.error(error);
    res.status(500).json({ verified: false, error: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(`✅ Server draait op http://localhost:${port}`);
});
