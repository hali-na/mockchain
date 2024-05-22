// 引入Supabase库
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { createFFmpeg, fetchFile } from 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.9.7/+esm';

// Supabase配置
const supabaseUrl = 'https://uyacotpozbebgfibwpwr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5YWNvdHBvemJlYmdmaWJ3cHdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYxNTM0NDQsImV4cCI6MjAzMTcyOTQ0NH0.3qRmxKDcHnfPQULDIDUgrhoOlERtUDGZGrXJyh4tcoc';
const supabase = createClient(supabaseUrl, supabaseKey);

document.addEventListener("DOMContentLoaded", function() {
  const questions = [
    'Tell me about yourself.',
    'What is your biggest challenge?',
    'What is your biggest achievement?'
  ];
  let currentQuestionIndex = 0;
  let mediaRecorder;
  let recordedBlobs = [];
  let stream;
  let reRecordCount = 0;
  let countdownInterval;
  let recordTime = 0;
  let uploadedFiles = [];

  const questionElement = document.getElementById('question');
  const countdownElement = document.getElementById('countdown');
  const videoElement = document.getElementById('video');
  const startRecordingButton = document.getElementById('start-recording-button');
  const stopRecordingButton = document.getElementById('stop-recording-button');
  const playbackButton = document.getElementById('playback-button');
  const reRecordButton = document.getElementById('re-record-button');
  const nextQuestionButton = document.getElementById('next-question-button');
  const messageElement = document.getElementById('message');

  questionElement.textContent = questions[currentQuestionIndex];

  async function startRecording() {
    console.log("Start recording");
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    videoElement.srcObject = stream;
    recordedBlobs = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        recordedBlobs.push(event.data);
      }
    };
    mediaRecorder.start();

    // 显示倒计时
    let countdown = 60;
    recordTime = 0;
    countdownElement.textContent = countdown;
    countdownInterval = setInterval(() => {
      countdown--;
      recordTime++;
      countdownElement.textContent = countdown;
      if (countdown <= 0) {
        clearInterval(countdownInterval);
        stopRecording();
        messageElement.textContent = 'Time is up!';
      }
    }, 1000);

    startRecordingButton.style.display = 'none';
    stopRecordingButton.style.display = 'block';
    messageElement.textContent = '';
  }

  function stopRecording() {
    console.log("Stop recording");
    clearInterval(countdownInterval);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    videoElement.srcObject.getTracks().forEach(track => track.stop());
    const superBuffer = new Blob(recordedBlobs, { type: 'video/webm' });
    videoElement.src = window.URL.createObjectURL(superBuffer);
    stopRecordingButton.style.display = 'none';
    playbackButton.style.display = 'block';
    reRecordButton.style.display = 'block';
    if (recordTime >= 30) {
      nextQuestionButton.style.display = 'block';
    } else {
      messageElement.textContent = 'You must record at least 30 seconds.';
    }
  }

  function playbackRecording() {
    console.log("Playback recording");
    videoElement.play();
  }

  async function reRecord() {
    console.log("Re-record");
    if (recordTime < 30) {
      // 如果时间不足30秒，不计入重新录制次数
      messageElement.textContent = '';
      recordedBlobs = [];
      await startRecording();
    } else {
      if (reRecordCount === 0) {
        reRecordCount++;
        if (recordedBlobs.length > 0) {
          recordedBlobs = [];
          await startRecording();
        }
      } else {
        messageElement.textContent = 'You can only re-record once.';
      }
    }
  }

  async function compressVideo(videoFile) {
    console.log("Compress video");
    const ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();

    const inputFileName = 'input.webm';
    const outputFileName = 'output.webm';

    ffmpeg.FS('writeFile', inputFileName, await fetchFile(videoFile));
    await ffmpeg.run('-i', inputFileName, '-vcodec', 'libvpx', '-crf', '30', outputFileName);
    const data = ffmpeg.FS('readFile', outputFileName);

    return new Blob([data.buffer], { type: 'video/webm' });
  }

  async function nextQuestion() {
    console.log("Next question");
    const videoFile = new Blob(recordedBlobs, { type: 'video/webm' });

    // 压缩视频
    const compressedVideoFile = await compressVideo(videoFile);

    const fileName = `question${currentQuestionIndex + 1}_${Date.now()}.webm`;
    console.log("Uploading video:", fileName);
    const { data, error } = await supabase.storage
      .from('temporary-register-videos')
      .upload(fileName, compressedVideoFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading video:', error.message);
      messageElement.textContent = 'Error uploading video: ' + error.message;
      return;
    }

    uploadedFiles.push(fileName);

    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
      questionElement.textContent = questions[currentQuestionIndex];
      playbackButton.style.display = 'none';
      reRecordButton.style.display = 'none';
      nextQuestionButton.style.display = 'none';
      startRecordingButton.style.display = 'block';
      reRecordCount = 0;
      console.log("Moved to next question");
    } else {
      // 在完成所有视频录制后创建用户
      const username = prompt("Enter your username:");
      const password = prompt("Enter your password:");

      // 注册新用户
      const { data: newUser, error: signUpError } = await supabase.from('profiles').insert({
        username: username,
        password: password
      });

      if (signUpError) {
        console.error('Registration error:', signUpError.message);
        messageElement.textContent = 'Registration failed: ' + signUpError.message;
        return;
      }

      // 将视频文件从 temporary-register-videos 移动到 video-pool
      for (const fileName of uploadedFiles) {
        const { data: fileData, error: moveError } = await supabase.storage
          .from('temporary-register-videos')
          .move(fileName, `video-pool/${fileName}`);

        if (moveError) {
          console.error('Error moving video:', moveError.message);
        } else {
          // 删除原始文件
          await supabase.storage
            .from('temporary-register-videos')
            .remove([fileName]);
        }
      }

      alert('Registration complete!');
      window.location.href = '/video-pool.html';
    }
  }

  startRecordingButton.addEventListener('click', async () => {
    console.log("Start button clicked");
    // 添加3秒倒计时
    let countdown = 3;
    countdownElement.textContent = countdown;
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        countdownElement.textContent = countdown;
      } else {
        clearInterval(countdownInterval);
        countdownElement.textContent = '';
        startRecording();
      }
    }, 1000);
  });

  stopRecordingButton.addEventListener('click', stopRecording);
  playbackButton.addEventListener('click', playbackRecording);
  reRecordButton.addEventListener('click', reRecord);
  nextQuestionButton.addEventListener('click', nextQuestion);
});