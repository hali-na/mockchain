// 引入Firebase库
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, deleteDoc, collection, query, where, getDocs, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Firebase配置
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 初始化Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", function() {
  const app = document.getElementById("app");
  const header = document.getElementById("header");
  let mediaRecorder;
  let recordedBlobs = [];
  let recordedVideos = [];
  let currentQuestionIndex = 0;
  const questions = [
    'Tell me about yourself',
    'What is your biggest challenge?',
    'What is your biggest achievement?'
  ];
  let loggedIn = false;

  function showHomePage() {
    app.innerHTML = `
      <div class="homepage">
        <h1>MockChain</h1>
        <p>Welcome to MockChain, your ultimate interview practice platform. Revolutionizing interview prep: free, community-driven, and rewarding.</p>
        <button id="login-button">Login</button>
        <button id="register-button">Register</button>
      </div>
    `;

    document.getElementById('login-button').addEventListener('click', showLoginPage);
    document.getElementById('register-button').addEventListener('click', showRegisterPage);
  }

  function showNavBar() {
    if (loggedIn) {
      header.innerHTML = `
        <img src="https://i.imgur.com/8ZK3Lt2.png" alt="MockChain Logo" id="logo">
        <h1>MockChain</h1>
        <nav>
          <button onclick="showVideoPoolPage()">Video Pool</button>
          <button onclick="showProfilePage()">Profile</button>
          <button onclick="showChatPage()">Chat</button>
        </nav>
      `;
    }
  }

  function showLoginPage() {
    app.innerHTML = `
      <div class="login-page">
        <h2>Login</h2>
        <input type="email" id="login-email" placeholder="Email">
        <input type="password" id="login-password" placeholder="Password">
        <button id="login-submit-button">Login</button>
      </div>
    `;

    document.getElementById('login-submit-button').addEventListener('click', login);
  }

  function showRegisterPage() {
    app.innerHTML = `
      <div class="register-page">
        <h2>Register</h2>
        <input type="text" id="register-username" placeholder="Username">
        <input type="email" id="register-email" placeholder="Email">
        <input type="password" id="register-password" placeholder="Password">
        <button id="register-submit-button">Register</button>
      </div>
    `;

    document.getElementById('register-submit-button').addEventListener('click', register);
  }

  function showRecordingPage() {
    showNextQuestion();
  }

  function showNextQuestion() {
    if (currentQuestionIndex < questions.length) {
      app.innerHTML = `
        <div class="recording-page">
          <h2>${questions[currentQuestionIndex]}</h2>
          <div id="countdown"></div>
          <video id="video" controls></video>
          <button id="start-recording-button">Start Recording</button>
          <button id="stop-recording-button">Complete Recording</button>
          <button id="playback-button" style="display:none;">Playback</button>
          <button id="re-record-button" style="display:none;">Re-record</button>
          <button id="next-question-button" style="display:none;">Next Question</button>
        </div>
      `;

      document.getElementById('start-recording-button').addEventListener('click', startCountdown);
      document.getElementById('stop-recording-button').addEventListener('click', stopRecording);
      document.getElementById('playback-button').addEventListener('click', playbackRecording);
      document.getElementById('re-record-button').addEventListener('click', reRecord);
      document.getElementById('next-question-button').addEventListener('click', nextQuestion);
    } else {
      submitVideos();
    }
  }

  function startCountdown() {
    let countdown = 3;
    const countdownElement = document.getElementById('countdown');
    countdownElement.innerHTML = countdown;

    const interval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        countdownElement.innerHTML = countdown;
      } else {
        clearInterval(interval);
        countdownElement.innerHTML = '';
        startRecording();
      }
    }, 1000);
  }

  async function startRecording() {
    const video = document.getElementById("video");
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    video.srcObject = stream;
    mediaRecorder = new MediaRecorder(stream);
    recordedBlobs = [];
    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        recordedBlobs.push(event.data);
      }
    };
    mediaRecorder.start();
  }

  function stopRecording() {
    mediaRecorder.stop();
    const video = document.getElementById("video");
    video.srcObject.getTracks().forEach(track => track.stop());
    const superBuffer = new Blob(recordedBlobs, { type: 'video/webm' });
    recordedVideos.push(superBuffer);
    video.src = window.URL.createObjectURL(superBuffer);
    document.getElementById('playback-button').style.display = 'block';
    document.getElementById('re-record-button').style.display = 'block';
    document.getElementById('next-question-button').style.display = 'block';
  }

  function playbackRecording() {
    const video = document.getElementById("video");
    video.play();
  }

  function reRecord() {
    recordedVideos.pop();
    showNextQuestion();
  }

  function nextQuestion() {
    currentQuestionIndex++;
    showNextQuestion();
  }

  function submitVideos() {
    const formData = new FormData();
    recordedVideos.forEach((video, index) => {
      formData.append(`video${index + 1}`, video, `video${index + 1}.webm`);
    });

    fetch('https://your-backend-api.com/upload', {
      method: 'POST',
      body: formData
    }).then(response => response.json())
      .then(data => {
        console.log('Success:', data);
        showVideoPoolPage();
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  }

  function showVideoPoolPage() {
    const q = query(collection(db, "videos"));
    getDocs(q).then((querySnapshot) => {
      app.innerHTML = `
        <div class="video-pool-page">
          <h2>Video Pool</h2>
          ${querySnapshot.docs.map(doc => {
            const videoData = doc.data();
            return `
              <div class="video-container">
                <video controls>
                  <source src="${videoData.url}" type="video/webm">
                  Your browser does not support the video tag.
                </video>
                <div class="slider-container">
                  <input type="range" min="0" max="10" value="0" class="slider" id="rating-slider-${doc.id}">
                  <span class="slider-value" id="slider-value-${doc.id}">0</span>
                </div>
                <button onclick="submitRating('${doc.id}', document.getElementById('rating-slider-${doc.id}').value)">Submit Rating</button>
              </div>
            `;
          }).join('')}
        </div>
      `;
      querySnapshot.docs.forEach(doc => {
        const slider = document.getElementById(`rating-slider-${doc.id}`);
        const sliderValue = document.getElementById(`slider-value-${doc.id}`);
        slider.oninput = function() {
          sliderValue.innerText = this.value;
        };
      });
    });
  }

  function submitRating(videoId, rating) {
    const user = auth.currentUser;
    const ratingDocRef = doc(db, "ratings", `${user.uid}_${videoId}`);
    setDoc(ratingDocRef, {
      userId: user.uid,
      videoId: videoId,
      rating: rating
    }).then(() => {
      // 为用户添加0.1个token的奖励
      const userDocRef = doc(db, "users", user.uid);
      getDoc(userDocRef).then((docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          const newTokens = (userData.tokens || 0) + 0.1;
          setDoc(userDocRef, { tokens: newTokens }, { merge: true }).then(() => {
            alert(`You have earned 0.1 token! Your total tokens: ${newTokens}`);
          });
        }
      });
      showVideoPoolPage();
    }).catch((error) => {
      console.error("Error submitting rating: ", error);
    });
  }

  function showProfilePage() {
    const user = auth.currentUser;
    const userDocRef = doc(db, "users", user.uid);

    getDoc(userDocRef).then((docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        app.innerHTML = `
          <div class="profile-page">
            <h2>Profile</h2>
            <p>Username: ${userData.username}</p>
            <p>Email: ${userData.email}</p>
            <button onclick="showRecordingPage()">Record New Video</button>
            <div class="video-list">
              <h3>Your Videos</h3>
              <!-- 动态生成用户视频列表 -->
            </div>
          </div>
        `;
        // 动态生成用户视频列表
        const videosQuery = query(collection(db, "videos"), where("userId", "==", user.uid));
        getDocs(videosQuery).then((querySnapshot) => {
          const videoListContainer = document.querySelector('.video-list');
          querySnapshot.forEach((doc) => {
            const videoData = doc.data();
            const videoElement = document.createElement('div');
            videoElement.innerHTML = `
              <div class="video-container">
                <video controls>
                  <source src="${videoData.url}" type="video/webm">
                  Your browser does not support the video tag.
                </video>
                <button onclick="deleteVideo('${doc.id}')">Delete</button>
              </div>
            `;
            videoListContainer.appendChild(videoElement);
          });
        });
      }
    });
  }

  function deleteVideo(videoId) {
    const videoDocRef = doc(db, "videos", videoId);
    deleteDoc(videoDocRef).then(() => {
      alert("Video deleted successfully.");
      showProfilePage();
    }).catch((error) => {
      console.error("Error deleting video: ", error);
    });
  }

  function showChatPage() {
    const user = auth.currentUser;
    app.innerHTML = `
      <div class="chat-page">
        <h2>Chat</h2>
        <div class="chat-list">
          <!-- 动态生成聊天用户列表 -->
        </div>
        <div class="chat-window">
          <!-- 动态生成聊天内容 -->
        </div>
        <input type="text" id="chat-input" placeholder="Type a message...">
        <button onclick="sendMessage()">Send</button>
      </div>
    `;

    const chatsQuery = query(collection(db, "chats"), where("userIds", "array-contains", user.uid));
    getDocs(chatsQuery).then((querySnapshot) => {
      const chatListContainer = document.querySelector('.chat-list');
      querySnapshot.forEach((doc) => {
        const chatData = doc.data();
        const otherUserId = chatData.userIds.find(id => id !== user.uid);
        const userDocRef = doc(db, "users", otherUserId);
        getDoc(userDocRef).then((userDocSnap) => {
          if (userDocSnap.exists()) {
            const otherUserData = userDocSnap.data();
            const chatElement = document.createElement('div');
            chatElement.innerHTML = `
              <div class="chat-item" onclick="openChat('${doc.id}')">
                <p>${otherUserData.username}</p>
              </div>
            `;
            chatListContainer.appendChild(chatElement);
          }
        });
      });
    });
  }

  function openChat(chatId) {
    const chatDocRef = doc(db, "chats", chatId);
    onSnapshot(chatDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const chatData = docSnap.data();
        const chatWindow = document.querySelector('.chat-window');
        chatWindow.innerHTML = chatData.messages.map(message => `
          <p><strong>${message.senderName}</strong>: ${message.text}</p>
        `).join('');
      }
    });
  }

  function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const messageText = chatInput.value;
    const user = auth.currentUser;
    const chatId = currentChatId;  // Assuming you have a way to set the current chat ID when opening a chat

    if (messageText && chatId) {
      const chatDocRef = doc(db, "chats", chatId);
      getDoc(chatDocRef).then((docSnap) => {
        if (docSnap.exists()) {
          const chatData = docSnap.data();
          chatData.messages.push({
            senderId: user.uid,
            senderName: user.email,  // You can replace this with username if available
            text: messageText,
            timestamp: new Date()
          });
          setDoc(chatDocRef, chatData).then(() => {
            chatInput.value = '';
          });
        }
      });
    }
  }

  function register() {
    const username = document.getElementById("register-username").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        setDoc(doc(db, "users", user.uid), {
          username: username,
          email: email,
        });
        loggedIn = true;
        showNavBar();
        showRecordingPage();
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  }

  function login() {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        loggedIn = true;
        showNavBar();
        showVideoPoolPage();
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      loggedIn = true;
      showNavBar();
      showVideoPoolPage();
    } else {
      showHomePage();
    }
  });

  showHomePage();
});
