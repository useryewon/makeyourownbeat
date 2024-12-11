const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let recorder, audioChunks = [], loops = [];

const clickSound = new Audio('click-sound.mp3');
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
        clickSound.currentTime = 0;
        clickSound.play();
    });
});

const video = document.getElementById('video-element');

let mediaStream;

Promise.all([
    navigator.mediaDevices.getUserMedia({ video: true, audio: false }),
    navigator.mediaDevices.getUserMedia({ audio: true })
]).then(streams => {
    const videoStream = streams[0];
    const audioStream = streams[1];

    // 기존 변수에 스트림 병합
    mediaStream = new MediaStream([...videoStream.getTracks(), ...audioStream.getTracks()]);

    // 비디오 스트림 설정
    video.srcObject = videoStream;
    video.style.display = 'none';

    // 새 비디오 캔버스와 연동
    const webcamCanvas = document.createElement('canvas');
    webcamCanvas.width = 1280;
    webcamCanvas.height = 720;

    const mainCanvas = document.createElement('canvas');
    mainCanvas.width = 1280;
    mainCanvas.height = 720;
    document.getElementById('visualizers-container').appendChild(mainCanvas);

    const webcamCanvasCtx = webcamCanvas.getContext('2d', { willReadFrequently: true });
    const mainCanvasCtx = mainCanvas.getContext('2d', { willReadFrequently: true });

    const filterStates = {
        origin: false,
        grayscale: false,
        negative: false
    };

    function applyFilter() {
        webcamCanvasCtx.drawImage(video, 0, 0, webcamCanvas.width, webcamCanvas.height);

        if (filterStates.grayscale) {
            webcamCanvasCtx.filter = 'grayscale(100%)';
        } else if (filterStates.negative) {
            const imageData = webcamCanvasCtx.getImageData(0, 0, webcamCanvas.width, webcamCanvas.height);
            const negativeData = applyNegative(imageData);
            webcamCanvasCtx.putImageData(negativeData, 0, 0);
        } else {
            webcamCanvasCtx.filter = 'none';
        }
    }

    function applyNegative(imageData) {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
        }
        return imageData;
    }

    function toggleWebcamStream(show) {
        video.style.display = show ? 'block' : 'none';
        if (show) {
            video.style.transform = 'scaleX(-1)'; // 반전 처리
        } else {
            video.style.transform = 'scaleX(1)'; // 원래 상태
        }
    }

    function drawMirrorMode() {
  ctx.save();
  ctx.scale(-1, 1); // 좌우 반전
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
  ctx.restore();
  requestAnimationFrame(drawMirrorMode); // 프레임마다 반복
}
    document.getElementById('origin').addEventListener('click', () => {
        toggleWebcamStream(true);
        filterStates.origin = true;
        filterStates.grayscale = false;
        filterStates.negative = false;
    });

    document.getElementById('grayscale').addEventListener('click', () => {
        toggleWebcamStream(true);
        filterStates.origin = false;
        filterStates.grayscale = true;
        filterStates.negative = false;
    });

    document.getElementById('negative').addEventListener('click', () => {
        toggleWebcamStream(true);
        filterStates.origin = false;
        filterStates.grayscale = false;
        filterStates.negative = true;
    });

    document.getElementById('off').addEventListener('click', () => {
        toggleWebcamStream(false);
        filterStates.origin = false;
        filterStates.grayscale = false;
        filterStates.negative = false;
    });

    function applyFilter() {
    // 웹캠 영상을 그리기 전에 필터를 적용
    webcamCanvasCtx.drawImage(video, 0, 0, webcamCanvas.width, webcamCanvas.height);

    if (filterStates.grayscale) {
        webcamCanvasCtx.filter = 'grayscale(100%)';
    } else if (filterStates.negative) {
        const imageData = webcamCanvasCtx.getImageData(0, 0, webcamCanvas.width, webcamCanvas.height);
        const negativeData = applyNegative(imageData);
        webcamCanvasCtx.putImageData(negativeData, 0, 0);
    } else {
        webcamCanvasCtx.filter = 'none';
    }
}

function draw() {
    requestAnimationFrame(draw);
    mainCanvasCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

    if (video.style.display !== 'none') {
        applyFilter();

        // 거울모드 적용: X축을 반전시켜서 그리기
        mainCanvasCtx.save();
        mainCanvasCtx.scale(-1, 1); // X축 반전
        mainCanvasCtx.drawImage(webcamCanvas, -mainCanvas.width, 0, mainCanvas.width, mainCanvas.height); // 반전된 좌표로 그리기
        mainCanvasCtx.restore();
    }

    // 기타 비주얼라이저 그리기
    loops.forEach((loop, index) => {
        const analyser = loop.analyser;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        const sliceWidth = mainCanvas.width / loops.length;
        const xOffset = index * sliceWidth;

        mainCanvasCtx.lineWidth = 2;
        mainCanvasCtx.strokeStyle = '#000fff';
        mainCanvasCtx.beginPath();

        let x = xOffset;

        for (let i = 0; i < bufferLength; i++) {
            let v = dataArray[i] / 128.0;
            let y = (v * mainCanvas.height) / 2;

            if (i === 0) {
                mainCanvasCtx.moveTo(x, y);
            } else {
                mainCanvasCtx.lineTo(x, y);
            }
            x += sliceWidth / bufferLength;
        }

        mainCanvasCtx.stroke();
    });

    mainCanvasCtx.beginPath();
    mainCanvasCtx.moveTo(0, 0);
    mainCanvasCtx.lineTo(0, mainCanvas.height);
    mainCanvasCtx.lineWidth = 2;
    mainCanvasCtx.strokeStyle = '#000fff';
    mainCanvasCtx.stroke();

    loops.forEach((_, index) => {
        const sliceWidth = mainCanvas.width / loops.length;
        const xOffset = (index + 1) * sliceWidth;

        mainCanvasCtx.beginPath();
        mainCanvasCtx.moveTo(xOffset, 0);
        mainCanvasCtx.lineTo(xOffset, mainCanvas.height);
        mainCanvasCtx.lineWidth = 1;
        mainCanvasCtx.strokeStyle = '#000fff';
        mainCanvasCtx.stroke();
    });
}


    draw();
}).catch(error => {
    console.error('Error accessing media devices.', error);
});

document.getElementById('record').addEventListener('click', () => {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }

    if (!recorder || recorder.state === "inactive") {
        recorder = new MediaRecorder(mediaStream);

        recorder.ondataavailable = (e) => {
            audioChunks.push(e.data);
        };

        recorder.onstop = () => {
            const audioBlob = new Blob(audioChunks);
            const audioURL = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioURL);
            audio.loop = true;

            loops.push({ audio, analyser: audioContext.createAnalyser() });
            audioChunks = [];

            const source = audioContext.createMediaElementSource(audio);
            const analyser = loops[loops.length - 1].analyser;
            source.connect(analyser);
            analyser.connect(audioContext.destination);
        };

        recorder.start();
    }
});

document.getElementById('stop').addEventListener('click', () => {
    if (recorder && recorder.state === "recording") {
        recorder.stop();
    }
});

document.getElementById('play').addEventListener('click', () => {
    loops.forEach(loop => {
        loop.audio.currentTime = 0;
        loop.audio.play();
    });
});

document.getElementById('deleteLast').addEventListener('click', () => {
    const lastLoop = loops.pop();
    if (lastLoop) {
        lastLoop.audio.pause();
        lastLoop.audio.currentTime = 0;
    }
});

document.getElementById('deleteAll').addEventListener('click', () => {
    loops.forEach(loop => {
        loop.audio.pause();
        loop.audio.currentTime = 0;
    });
    loops = [];
    mainCanvasCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
});