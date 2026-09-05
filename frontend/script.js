(function() {
  console.log('🚀 Script loaded');

  // ============================================
  // CONFIG
  // ============================================
  const CONFIG = {
    API_URL: '/api',
    WS_URL: `ws://${window.location.host}`,
    GITHUB_USERNAME: 'Saroons-Alt' // CHANGE THIS TO YOUR GITHUB USERNAME
  };

  // ============================================
  // 🎯 RIG SETTINGS - CHANGE THESE TO BUMP NUMBERS
  // ============================================
  const RIG = {
    EXTRA_VIEWS: 0,      // ← Change to 100, 500, 1000 to add extra views each visit
    STARTING_LIKES: 50   // ← Change to 50, 100, 500 to set starting like count
  };

  // ============================================
  // NAV TOGGLE
  // ============================================
  const toggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (toggle) {
    toggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  // ============================================
  // ACTIVE NAV LINK
  // ============================================
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.nav-link[data-section]');

  function setActive(id) {
    navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.section === id);
    });
  }

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const targetId = item.dataset.section;
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
        setActive(targetId);
        if (navLinks) navLinks.classList.remove('open');
      }
    });
  });

  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      let current = 'home';
      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 120) current = section.id;
      });
      setActive(current);
    }, 60);
  });

  // ============================================
  // TERMINAL
  // ============================================
  const termInput = document.getElementById('terminalInput');
  const termOutput = document.getElementById('terminalOutput');
  const terminalWidget = document.getElementById('terminalWidget');
  
  let ws = null;
  let wsConnected = false;

  function connectWebSocket() {
    try {
      ws = new WebSocket(CONFIG.WS_URL);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        wsConnected = true;
        if (termOutput) {
          termOutput.innerText = '🔌 Connected to server\nType "help" for commands\n─────────────────────────────';
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'clear') {
            if (termOutput) termOutput.innerText = '';
            return;
          }
          
          if (data.type === 'output') {
            const current = termOutput ? termOutput.innerText : '';
            if (termOutput) {
              termOutput.innerText = current ? current + '\n' + data.content : data.content;
            }
            const terminalBody = terminalWidget ? terminalWidget.querySelector('.terminal-body') : null;
            setTimeout(() => {
              if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight;
            }, 20);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        wsConnected = false;
        if (termOutput) {
          termOutput.innerText = '⚠️ Connection error\nFalling back to local mode\n─────────────────────────────\n$ help\nabout · projects · skills · experience · education · contact · clear';
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected, trying to reconnect...');
        wsConnected = false;
        setTimeout(connectWebSocket, 3000);
      };
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      if (termOutput) {
        termOutput.innerText = '⚠️ Running in local mode\n─────────────────────────────\n$ help\nabout · projects · skills · experience · education · contact · clear';
      }
    }
  }

  connectWebSocket();

  if (termInput) {
    termInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const cmd = termInput.value.trim();
        if (!cmd) return;
        
        termInput.value = '';
        
        if (wsConnected && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ command: cmd }));
        } else {
          const commandMap = {
            help: 'about · projects · skills · experience · education · contact · clear',
            about: '[ About — coming soon ]',
            projects: '📁 portfolio · task-manager · api-playground',
            skills: 'HTML · CSS · JavaScript · Node.js · (learning: APIs, Databases, Auth)',
            experience: '[ Experience — coming soon ]',
            education: 'Class 12 Student',
            contact: '📬 email / github / linkedin (see contact section)',
            clear: 'CLEAR'
          };
          
          const trimmed = cmd.toLowerCase();
          if (trimmed === 'clear') {
            if (termOutput) termOutput.innerText = '';
            return;
          }
          const response = commandMap[trimmed];
          const output = response ? `$ ${cmd}\n${response}` : `$ ${cmd}\ncommand not found: ${cmd} · try "help"`;
          const current = termOutput ? termOutput.innerText : '';
          if (termOutput) {
            termOutput.innerText = current ? current + '\n' + output : output;
          }
          
          const terminalBody = terminalWidget ? terminalWidget.querySelector('.terminal-body') : null;
          setTimeout(() => {
            if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight;
          }, 20);
          
          const sectionMap = {
            about: 'about',
            projects: 'projects',
            skills: 'skills',
            experience: 'experience',
            education: 'education',
            contact: 'contact'
          };
          if (sectionMap[trimmed]) {
            const target = document.getElementById(sectionMap[trimmed]);
            if (target) {
              setTimeout(() => {
                target.scrollIntoView({ behavior: 'smooth' });
                setActive(sectionMap[trimmed]);
              }, 100);
            }
          }
        }
      }
    });
  }

  if (terminalWidget) {
    terminalWidget.addEventListener('click', () => {
      if (termInput) termInput.focus();
    });
  }

  // ============================================
  // CONTACT FORM
  // ============================================
  const sendBtn = document.getElementById('sendBtn');
  const formStatus = document.getElementById('formStatus');
  
  if (sendBtn) {
    sendBtn.addEventListener('click', async () => {
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const message = document.getElementById('message').value.trim();
      
      if (!name || !email || !message) {
        formStatus.innerText = '⚠️ Please fill in all fields.';
        formStatus.style.color = '#ff6b6b';
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        formStatus.innerText = '⚠️ Please enter a valid email address.';
        formStatus.style.color = '#ff6b6b';
        return;
      }
      
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending...';
      formStatus.innerText = '⏳ Sending message...';
      formStatus.style.color = '#b0b0b0';
      
      try {
        const response = await fetch(`${CONFIG.API_URL}/contact`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email, message })
        });
        
        const data = await response.json();
        
        if (data.success) {
          formStatus.innerText = '✅ ' + data.message;
          formStatus.style.color = '#6bff6b';
          document.getElementById('name').value = '';
          document.getElementById('email').value = '';
          document.getElementById('message').value = '';
        } else {
          formStatus.innerText = '❌ ' + (data.error || 'Failed to send message');
          formStatus.style.color = '#ff6b6b';
        }
      } catch (error) {
        console.error('Contact form error:', error);
        formStatus.innerText = '❌ Network error. Please try again.';
        formStatus.style.color = '#ff6b6b';
      } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
        
        setTimeout(() => {
          formStatus.innerText = '(mock submission — no real backend)';
          formStatus.style.color = 'var(--text-secondary)';
        }, 5000);
      }
    });
  }

  // ============================================
  // THEME TOGGLE
  // ============================================
  const themeToggle = document.getElementById('themeToggle');
  
  if (themeToggle) {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      themeToggle.textContent = '☀️';
    }
    
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      
      if (currentTheme === 'light') {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.textContent = '☀️';
        localStorage.setItem('theme', 'light');
      }
    });
  }

  // ============================================
  // STATS - Fetch GitHub Data
  // ============================================
  async function fetchGitHubStats() {
    const username = CONFIG.GITHUB_USERNAME;
    
    try {
      const userRes = await fetch(`https://api.github.com/users/${username}`);
      const userData = await userRes.json();
      
      document.getElementById('repoCount').textContent = userData.public_repos || 0;
      document.getElementById('followerCount').textContent = userData.followers || 0;
      document.getElementById('followingCount').textContent = userData.following || 0;
      document.getElementById('userLocation').textContent = userData.location || 'Not specified';
      
      // Hireable status
      const hireable = userData.hireable === true ? '✅ Yes' : '❌ No';
      document.getElementById('hireable').textContent = hireable;
      
      // Company
      document.getElementById('userCompany').textContent = userData.company || 'Not specified';
      
    } catch (error) {
      console.error('Error fetching GitHub data:', error);
      document.getElementById('repoCount').textContent = 'Error';
      document.getElementById('userLocation').textContent = 'Could not fetch';
      document.getElementById('hireable').textContent = 'Error';
      document.getElementById('userCompany').textContent = 'Error';
    }
  }

  // ============================================
  // STATS - Views
  // ============================================
  function updateViewCount() {
    let views = parseInt(localStorage.getItem('portfolioViews')) || 0;
    views += 1 + RIG.EXTRA_VIEWS;
    localStorage.setItem('portfolioViews', views);
    const viewCount = document.getElementById('viewCount');
    if (viewCount) viewCount.textContent = views;
  }

  // ============================================
  // STATS - Like Button
  // ============================================
  const likeBtn = document.getElementById('likeBtn');
  const likeDisplay = document.getElementById('likeCount');
  
  if (likeBtn && likeDisplay) {
    let likeCount = parseInt(localStorage.getItem('portfolioLikes'));
    
    if (isNaN(likeCount) || likeCount === 0) {
      likeCount = RIG.STARTING_LIKES;
      localStorage.setItem('portfolioLikes', likeCount);
    }
    
    let userLiked = localStorage.getItem('portfolioUserLiked') === 'true';
    
    function updateLikeDisplay() {
      likeDisplay.textContent = likeCount;
      if (userLiked) {
        likeBtn.classList.add('liked');
        likeBtn.querySelector('.like-icon').textContent = '❤';
      } else {
        likeBtn.classList.remove('liked');
        likeBtn.querySelector('.like-icon').textContent = '♡';
      }
    }
    
    likeBtn.addEventListener('click', function() {
      if (!userLiked) {
        likeCount += 1;
        userLiked = true;
        localStorage.setItem('portfolioLikes', likeCount);
        localStorage.setItem('portfolioUserLiked', 'true');
        updateLikeDisplay();
        
        const icon = this.querySelector('.like-icon');
        icon.style.transform = 'scale(1.5)';
        setTimeout(() => {
          icon.style.transform = 'scale(1)';
        }, 300);
      } else {
        this.style.opacity = '0.6';
        setTimeout(() => {
          this.style.opacity = '1';
        }, 500);
      }
    });
    
    updateLikeDisplay();
    console.log('❤️ Initial like count:', likeCount);
  }

  // ============================================
  // INIT
  // ============================================
  setActive('home');
  updateViewCount();
  fetchGitHubStats();
  
  console.log('🚀 Portfolio ready!');
  console.log('🔧 RIG Settings:', RIG);
  
})();