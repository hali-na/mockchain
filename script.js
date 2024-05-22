// 引入Supabase库
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Supabase配置
const supabaseUrl = 'https://uyacotpozbebgfibwpwr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5YWNvdHBvemJlYmdmaWJ3cHdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYxNTM0NDQsImV4cCI6MjAzMTcyOTQ0NH0.3qRmxKDcHnfPQULDIDUgrhoOlERtUDGZGrXJyh4tcoc';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", function() {
  const questions = [
    'Tell me about yourself.',
    'What is your biggest challenge?',
    'What is your biggest achievement?'
  ];
  let currentQuestionIndex = 0;
  let mediaRecorder;
  let recordedBlobs;

  const questionElement = document.getElementById('question');
  const videoElement = document.getElementById('video');
  const startRecordingButton = document.getElementById('start-recording-button');
  const stopRecordingButton = document.getElementById('stop-recording-button');
  const nextQuestionButton = document.getElementById('next-question-button');

  questionElement.textContent = questions[currentQuestionIndex];

  startRecordingButton.addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    videoElement.srcObject = stream;
    recordedBlobs = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        recordedBlobs.push(event.data);
      }
    };
    mediaRecorder.start();
    startRecordingButton.style.display = 'none';
    stopRecordingButton.style.display = 'block';
  });

  stopRecordingButton.addEventListener('click', () => {
    mediaRecorder.stop();
    videoElement.srcObject.getTracks().forEach(track => track.stop());
    const superBuffer = new Blob(recordedBlobs, { type: 'video/webm' });
    videoElement.src = window.URL.createObjectURL(superBuffer);
    stopRecordingButton.style.display = 'none';
    nextQuestionButton.style.display = 'block';
  });

  nextQuestionButton.addEventListener('click', async () => {
    // 上传视频到服务器
    const user = supabase.auth.user();
    const formData = new FormData();
    formData.append('file', new Blob(recordedBlobs, { type: 'video/webm' }), `question${currentQuestionIndex + 1}.webm`);
    await fetch(`/upload-video?userId=${user.id}&question=${currentQuestionIndex + 1}`, {
      method: 'POST',
      body: formData
    });

    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
      questionElement.textContent = questions[currentQuestionIndex];
      nextQuestionButton.style.display = 'none';
      startRecordingButton.style.display = 'block';
    } else {
      alert('Registration complete!');
      window.location.href = '/video-pool.html';
    }
  });
});