const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const { WebSocketServer } = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// ============================================
// SERVE STATIC FILES (with proper MIME types)
// ============================================
app.use(express.static(path.join(__dirname, '../frontend'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.xml')) {
      res.setHeader('Content-Type', 'application/xml');
    }
    if (filePath.endsWith('.txt')) {
      res.setHeader('Content-Type', 'text/plain');
    }
    if (filePath.endsWith('.webmanifest')) {
      res.setHeader('Content-Type', 'application/manifest+json');
    }
  }
}));

// Explicit routes for sitemap and robots
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(__dirname, '../frontend/sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, '../frontend/robots.txt'));
});

// ============================================
// VIEWS COUNTER
// ============================================

const viewsFile = path.join(__dirname, 'views.json');

if (!fs.existsSync(viewsFile)) {
  fs.writeFileSync(viewsFile, JSON.stringify({ views: 0 }));
}

app.get('/api/views', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(viewsFile, 'utf8'));
    res.json({ views: data.views });
  } catch (error) {
    res.json({ views: 0 });
  }
});

app.post('/api/views/increment', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(viewsFile, 'utf8'));
    data.views += 1;
    fs.writeFileSync(viewsFile, JSON.stringify(data, null, 2));
    res.json({ views: data.views });
  } catch (error) {
    res.json({ views: 0 });
  }
});

// ============================================
// CONTACT FORM
// ============================================

const hasEmailConfig = process.env.EMAIL_USER && process.env.EMAIL_PASS;
let transporter = null;

if (hasEmailConfig) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  console.log('✅ Email configured');
} else {
  console.log('⚠️ Email not configured - using file storage');
}

app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email address' });
  }

  try {
    if (transporter) {
      await transporter.sendMail({
        from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `New Contact Message from ${name}`,
        html: `
          <h3>New message from your portfolio</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `,
        replyTo: email
      });

      res.json({ success: true, message: 'Message sent successfully!' });
    } else {
      const messagesFile = path.join(__dirname, 'messages.json');
      let messages = [];
      
      if (fs.existsSync(messagesFile)) {
        messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
      }
      
      messages.push({
        id: Date.now(),
        name,
        email,
        message,
        timestamp: new Date().toISOString()
      });
      
      fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
      
      res.json({ success: true, message: 'Message saved successfully!' });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// ============================================
// TERMINAL - WebSocket
// ============================================

const clients = new Set();

const terminalResponses = {
  help: 'Available commands:\n' +
        '  about      - About me\n' +
        '  projects   - My projects\n' +
        '  skills     - Technical skills\n' +
        '  experience - Work experience\n' +
        '  education  - Education background\n' +
        '  contact    - Contact information\n' +
        '  date       - Current date/time\n' +
        '  whoami     - Display user info\n' +
        '  clear      - Clear terminal\n' +
        '  help       - Show this help',

  about: '17-year-old making things on the internet.\n' +
         'Class 12 student, learning web development.\n' +
         'Into tech, games, football, and figuring things out.',

  projects: 'My Projects:\n' +
            '  📁 Portfolio v1    - Terminal-inspired portfolio\n' +
            '  📁 Task Manager    - Task tracking with local storage\n' +
            '  📁 API Explorer    - REST API exploration',

  skills: 'Technical Skills:\n' +
          '  ✅ HTML, CSS, JavaScript, Python, Java\n' +
          '  ✅ NodeJS, Framer Motion, Mongoose\n' +
          '  🔄 Learning: APIs, Databases, Authentication',

  experience: 'Independent Web Developer (Jan 2026 - Present)\n' +
              'Building websites and learning full-stack development.',

  education: 'Class 12 · Navyug School Mandir (Humanities)\n' +
             'Class 10 · Navyug School, Mandir Marg (70%)',

  contact: 'Contact Me:\n' +
           '  📧 Email: naitiksarohaa9@gmail.com\n' +
           '  💻 GitHub: /Saroons-Alt\n' +
           '  🔗 LinkedIn: /in/saroonn',

  date: () => {
    const now = new Date();
    return `Current date/time: ${now.toLocaleString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })}`;
  },

  whoami: 'User: Saroon\n' +
          'Role: Web Developer & Student\n' +
          'Location: India'
};

wss.on('connection', (ws) => {
  console.log('New terminal client connected');
  clients.add(ws);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const command = data.command?.trim().toLowerCase();

      if (!command) {
        ws.send(JSON.stringify({
          type: 'output',
          content: '⚠️ Please enter a command'
        }));
        return;
      }

      if (command === 'clear') {
        ws.send(JSON.stringify({ type: 'clear' }));
        return;
      }

      let response;
      if (terminalResponses[command]) {
        response = typeof terminalResponses[command] === 'function' 
          ? terminalResponses[command]() 
          : terminalResponses[command];
      } else {
        response = `❌ Command not found: "${command}"\nType "help" for available commands`;
      }

      ws.send(JSON.stringify({
        type: 'output',
        content: `$ ${command}\n${response}`
      }));

    } catch (error) {
      console.error('Terminal error:', error);
      ws.send(JSON.stringify({
        type: 'output',
        content: '❌ Error processing command'
      }));
    }
  });

  ws.on('close', () => {
    console.log('Terminal client disconnected');
    clients.delete(ws);
  });
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Portfolio backend is running!',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket ready for terminal connections`);
  console.log(`📁 Serving frontend from: ${path.join(__dirname, '../frontend')}`);
  
  if (!hasEmailConfig) {
    console.log(`⚠️ Email not configured - messages will be saved to messages.json`);
  } else {
    console.log(`✅ Email configured - messages will be sent to ${process.env.EMAIL_USER}`);
  }
});
