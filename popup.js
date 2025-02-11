const captureButton = document.getElementById("captureToggle");
captureButton.addEventListener("click", toggleCapture);

let mediaRecorder = null;
let chunks = [];
let isCapturing = false;

function toggleCapture() {
  if (!isCapturing) {
    startCapture();
  } else {
    stopCapture();
  }
}

function startCapture() {
  chrome.tabCapture.capture(
    {
      audio: true,
      video: false,
    },
    (stream) => {
      let context = new AudioContext();
      let tstream = context.createMediaStreamSource(stream);
      tstream.connect(context.destination);

      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        //saveAsWavFile();
        await saveAsMp3File();
      };

      mediaRecorder.start();
      isCapturing = true;
      captureButton.textContent = "Stop Capture";
    }
  );
}

async function saveAsMp3File() {
  // First, create a blob from the recorded chunks
  const webmBlob = new Blob(chunks, { type: "audio/webm" });
  
  // Convert webm audio to audio buffer
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Convert to MP3 using lame.js
  const mp3Encoder = new lamejs.Mp3Encoder(1, audioBuffer.sampleRate, 128);
  const samples = audioBuffer.getChannelData(0);
  const mp3Data = [];
  
  // Convert float32 samples to int16
  const sampleCount = samples.length;
  const int16Samples = new Int16Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    int16Samples[i] = samples[i] * 0x7FFF;
  }
  
  // Encode to MP3
  const mp3Chunk = mp3Encoder.encodeBuffer(int16Samples);
  if (mp3Chunk.length > 0) {
    mp3Data.push(mp3Chunk);
  }
  
  // Get the final chunk
  const finalChunk = mp3Encoder.flush();
  if (finalChunk.length > 0) {
    mp3Data.push(finalChunk);
  }
  
  // Create MP3 Blob
  const mp3Blob = new Blob(mp3Data, { type: "audio/mp3" });
  
  // Save the file
  const url = URL.createObjectURL(mp3Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "captured_audio.mp3";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  // Reset state
  chunks = [];
  isCapturing = false;
  captureButton.textContent = "Start Capture";
}

function saveAsWavFile(){
  const blob = new Blob(chunks, { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "captured_audio.wav";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);  // Clean up the URL object
  chunks = [];
  isCapturing = false;
  captureButton.textContent = "Start Capture";
}

function stopCapture() {
  if (mediaRecorder) {
    mediaRecorder.stop();
  }
}