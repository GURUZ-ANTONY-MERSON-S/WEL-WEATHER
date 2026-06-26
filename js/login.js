/**
 * WEL-Weather v1.0 - Secure Authorization Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginLoader = document.getElementById('loginLoader');
  const loaderStatus = document.getElementById('loaderStatus');
  const errorBanner = document.getElementById('errorBanner');
  const errorText = document.getElementById('errorText');
  
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const rememberMeCheck = document.getElementById('rememberMe');
  const guestBtn = document.getElementById('guestBtn');
  const forgotBtn = document.getElementById('forgotPasswordBtn');

  // Verify CONFIG is loaded
  const keys = window.CONFIG ? window.CONFIG.STORAGE_KEYS : {
    USER: 'wel_weather_user',
    API_KEY: 'wel_weather_api_key'
  };

  // Populate remembered credentials if exist
  const rememberedUser = localStorage.getItem('wel_remembered_username');
  if (rememberedUser && usernameInput) {
    usernameInput.value = rememberedUser;
    if (rememberMeCheck) rememberMeCheck.checked = true;
  }

  // Helper: Trigger Loading Screen
  function showLoader(message, callback) {
    if (loginLoader && loaderStatus) {
      loaderStatus.textContent = message;
      loginLoader.classList.add('active');
    }
    setTimeout(callback, 1500); // realistic network delay
  }

  function hideLoader() {
    if (loginLoader) loginLoader.classList.remove('active');
  }

  // Handle Form Submission
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      // Hide any existing errors
      if (errorBanner) errorBanner.classList.remove('active');

      if (!username || !password) {
        showError('Please enter both security credentials.');
        return;
      }

      // Portfolio authentication: let standard meteorologist credentials in easily
      // Acknowledging password length of 4 or matching "password" is standard
      const isAuthorized = password.length >= 4;

      if (isAuthorized) {
        showLoader('Authorizing security clearance...', () => {
          showLoader('Syncing atmospheric databases...', () => {
            // Success! Store user
            const userProfile = {
              username: username,
              role: 'Senior Meteorologist',
              isGuest: false,
              loginTime: new Date().toISOString()
            };
            
            localStorage.setItem(keys.USER, JSON.stringify(userProfile));
            
            // Handle Remember Me
            if (rememberMeCheck && rememberMeCheck.checked) {
              localStorage.setItem('wel_remembered_username', username);
            } else {
              localStorage.removeItem('wel_remembered_username');
            }

            // Redirect
            window.location.href = '/dashboard.html';
          });
        });
      } else {
        setTimeout(() => {
          showError('Access denied: Password must be at least 4 characters for security authorization.');
        }, 400);
      }
    });
  }

  // Handle Guest Mode Entry
  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      if (errorBanner) errorBanner.classList.remove('active');
      
      showLoader('Provisioning sandbox guest terminal...', () => {
        showLoader('Applying general satellite coverage...', () => {
          const userProfile = {
            username: 'Guest Meteorologist',
            role: 'Associate Observer',
            isGuest: true,
            loginTime: new Date().toISOString()
          };
          
          localStorage.setItem(keys.USER, JSON.stringify(userProfile));
          window.location.href = '/dashboard.html';
        });
      });
    });
  }

  // Forgot password handler
  if (forgotBtn) {
    forgotBtn.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Security Access Key recovery protocol: In standard sandbox deployment, use any username and a password of at least 4 characters to gain full clearance.');
    });
  }

  // Helper: Display Form Errors
  function showError(msg) {
    if (errorBanner && errorText) {
      errorText.textContent = msg;
      errorBanner.classList.add('active');
    }
  }
});
