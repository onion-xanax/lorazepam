document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('dot-container');
    const dotCount = 5000;

    for (let i = 0; i < dotCount; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.style.left = Math.random() * 5000 + 'px';
        dot.style.top = Math.random() * 5000 + 'px';
        container.appendChild(dot);
    }

    const photos = document.querySelectorAll('.slider-photo');
    const dotsContainer = document.querySelector('.slider-dots');
    let currentPhoto = 0;

    photos.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'dot';
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => {
            currentPhoto = index;
            updateSlider();
        });
        dotsContainer.appendChild(dot);
    });

    function updateSlider() {
        photos.forEach((photo, index) => {
            photo.classList.toggle('active', index === currentPhoto);
        });
        document.querySelectorAll('.slider-dots .dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === currentPhoto);
        });
    }

    setInterval(() => {
        currentPhoto = (currentPhoto + 1) % photos.length;
        updateSlider();
    }, 7000);

    const audio = document.getElementById('audio-player');
    const playBtn = document.getElementById('play-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const volumeSlider = document.getElementById('volume-slider');

    audio.volume = volumeSlider.value / 100;

    playBtn.addEventListener('click', function () {
        audio.play().then(() => {
            initVisualizer();
        }).catch(error => {
            const testAudio = new Audio('/music/onion.mp3');
            testAudio.play().then(() => {
                testAudio.pause();
            });
        });
    });

    pauseBtn.addEventListener('click', function () {
        audio.pause();
    });

    stopBtn.addEventListener('click', function () {
        audio.pause();
        audio.currentTime = 0;
    });

    volumeSlider.addEventListener('input', function () {
        audio.volume = this.value / 100;
    });

    const visualizer = document.getElementById('visualizer');
    const bars = 20;

    for (let i = 0; i < bars; i++) {
        const bar = document.createElement('div');
        bar.className = 'visualizer-bar';
        bar.style.height = '5px';
        visualizer.appendChild(bar);
    }

    let audioContext = null;
    let analyser = null;
    let source = null;
    let animationId = null;

    function initVisualizer() {
        if (audioContext) return;

        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();

            source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            analyser.fftSize = 64;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            function updateVisualizer() {
                if (!analyser) return;

                analyser.getByteFrequencyData(dataArray);

                const bars = document.querySelectorAll('.visualizer-bar');
                bars.forEach((bar, index) => {
                    const value = dataArray[index % bufferLength];
                    const height = 5 + (value / 255) * 75;
                    bar.style.height = `${height}px`;

                    const hue = 200 + (value / 255) * 60;
                    bar.style.background = `linear-gradient(to top, hsl(${hue}, 100%, 60%), #4a148c)`;
                });

                animationId = requestAnimationFrame(updateVisualizer);
            }

            updateVisualizer();

        } catch (error) {
            const bars = document.querySelectorAll('.visualizer-bar');
            let fakeValue = 0;

            function fakeVisualizer() {
                bars.forEach((bar, index) => {
                    const value = Math.sin(Date.now() / 200 + index) * 30 + 40;
                    const height = 5 + (value / 255) * 75;
                    bar.style.height = `${height}px`;

                    const hue = 200 + (value / 255) * 60;
                    bar.style.background = `linear-gradient(to top, hsl(${hue}, 100%, 60%), #4a148c)`;
                });

                requestAnimationFrame(fakeVisualizer);
            }

            fakeVisualizer();
        }
    }

    audio.addEventListener('play', function () {
        initVisualizer();
    });

    const cmdBody = document.querySelector('.cmd-body');
    const cmdOutput = document.querySelector('.cmd-output');
    let currentInputLine = null;
    let currentInput = null;
    let inputValue = '';
    let lastApiResponse = null;
    const saveTxtBtn = document.getElementById('save-txt-btn');
    const saveJsonBtn = document.getElementById('save-json-btn');
    const clearCmdBtn = document.getElementById('clear-cmd-btn');

    function createInputLine() {
        const activeLine = document.createElement('div');
        activeLine.className = 'cmd-line active-line';
        activeLine.innerHTML = `
            <span class="cmd-prompt">[server~root]</span>
            <input type="text" class="cmd-input" value="${inputValue}" autofocus>
            <span class="cmd-cursor"></span>
        `;

        cmdOutput.appendChild(activeLine);
        currentInputLine = activeLine;
        currentInput = activeLine.querySelector('.cmd-input');

        currentInput.focus();

        currentInput.addEventListener('input', function () {
            inputValue = this.value;
        });

        currentInput.addEventListener('keydown', handleKeyPress);

        cmdBody.scrollTop = cmdBody.scrollHeight;
    }

    async function searchPhoneNumber(phoneNumber) {
        const startTime = Date.now();
        try {
            const response = await fetch('/api/search_phone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone: phoneNumber })
            });

            const result = await response.json();
            result.search_time_ms = Date.now() - startTime;
            return result;
        } catch (error) {
            console.error('Error searching phone:', error);
            return { error: 'Network error', search_time_ms: Date.now() - startTime };
        }
    }

    function formatApiResponse(data) {
        if (data.error) {
            return `<div class="api-error">[ERROR] ${data.error}</div>`;
        }

        let html = '';

        if (data.results && data.results.length > 0) {
            html += `<div class="api-success">[SUCCESS] Найдено ${data.results.length} результатов (${data.search_time_ms || 0} ms)</div>`;

            data.results.forEach((result, index) => {
                html += `<div class="api-info">\n--- Результат ${index + 1} ---</div>`;

                for (const [key, value] of Object.entries(result)) {
                    html += `<div class="api-result-line">
                        <span class="api-result-key">${key}:</span>
                        <span class="api-result-value">${value}</span>
                    </div>`;
                }
            });
        } else {
            html += `<div class="api-info">[INFO] По данному номеру ничего не найдено (${data.search_time_ms || 0} ms)</div>`;
        }

        return html;
    }

    async function handleKeyPress(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const phoneNumber = inputValue.trim();

            currentInput.removeEventListener('keydown', handleKeyPress);
            currentInput.disabled = true;

            const newLine = document.createElement('div');
            newLine.className = 'cmd-line';
            newLine.innerHTML = `<span class="cmd-prompt">[server~root]</span> ${phoneNumber}`;

            currentInputLine.parentNode.insertBefore(newLine, currentInputLine);
            currentInputLine.classList.remove('active-line');

            if (phoneNumber) {
                const loadingLine = document.createElement('div');
                loadingLine.className = 'cmd-line api-loading';
                loadingLine.innerHTML = `[SYSTEM] Поиск номера ${phoneNumber}...`;
                currentInputLine.parentNode.insertBefore(loadingLine, currentInputLine);

                cmdBody.scrollTop = cmdBody.scrollHeight;

                const result = await searchPhoneNumber(phoneNumber);
                lastApiResponse = result;

                loadingLine.remove();

                const responseLine = document.createElement('div');
                responseLine.innerHTML = formatApiResponse(result);
                currentInputLine.parentNode.insertBefore(responseLine, currentInputLine);

                saveTxtBtn.disabled = false;
                saveJsonBtn.disabled = false;

                inputValue = '';
                setTimeout(() => createInputLine(), 100);
            } else {
                const errorLine = document.createElement('div');
                errorLine.className = 'cmd-line api-error';
                errorLine.innerHTML = '[ERROR] Поле не может быть пустым';
                currentInputLine.parentNode.insertBefore(errorLine, currentInputLine);

                setTimeout(() => {
                    inputValue = '';
                    createInputLine();
                }, 500);
            }

            cmdBody.scrollTop = cmdBody.scrollHeight;
        } else if (e.key === 'Tab') {
            e.preventDefault();
        }
    }

    saveTxtBtn.addEventListener('click', async function () {
        if (!lastApiResponse) return;

        saveTxtBtn.disabled = true;
        try {
            let content = `Результаты поиска по номеру телефона\n`;
            content += `Дата поиска: ${new Date().toLocaleString()}\n\n`;

            if (lastApiResponse.results && lastApiResponse.results.length > 0) {
                content += `Найдено результатов: ${lastApiResponse.results.length}\n`;
                content += `Время поиска: ${lastApiResponse.search_time_ms || 0} ms\n\n`;

                lastApiResponse.results.forEach((result, index) => {
                    content += `=== Результат ${index + 1} ===\n`;
                    for (const [key, value] of Object.entries(result)) {
                        content += `${key}: ${value}\n`;
                    }
                    content += '\n';
                });
            } else {
                content += `По данному номеру ничего не найдено\n`;
                content += `Время поиска: ${lastApiResponse.search_time_ms || 0} ms\n`;
            }

            const response = await fetch('/api/save_txt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ content: content })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'search_results.txt';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                const infoLine = document.createElement('div');
                infoLine.className = 'cmd-line api-success';
                infoLine.innerHTML = `[INFO] Файл успешно сохранен`;
                cmdOutput.appendChild(infoLine);
                cmdBody.scrollTop = cmdBody.scrollHeight;
            }
        } catch (error) {
            const errorLine = document.createElement('div');
            errorLine.className = 'cmd-line api-error';
            errorLine.innerHTML = '[ERROR] Ошибка сохранения TXT';
            cmdOutput.appendChild(errorLine);
            cmdBody.scrollTop = cmdBody.scrollHeight;
        } finally {
            saveTxtBtn.disabled = false;
        }
    });

    saveJsonBtn.addEventListener('click', async function () {
        if (!lastApiResponse) return;

        saveJsonBtn.disabled = true;
        try {
            const response = await fetch('/api/save_json', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(lastApiResponse)
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'search_results.json';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                const infoLine = document.createElement('div');
                infoLine.className = 'cmd-line api-success';
                infoLine.innerHTML = `[INFO] Файл успешно сохранен`;
                cmdOutput.appendChild(infoLine);
                cmdBody.scrollTop = cmdBody.scrollHeight;
            }
        } catch (error) {
            const errorLine = document.createElement('div');
            errorLine.className = 'cmd-line api-error';
            errorLine.innerHTML = '[ERROR] Ошибка сохранения JSON';
            cmdOutput.appendChild(errorLine);
            cmdBody.scrollTop = cmdBody.scrollHeight;
        } finally {
            saveJsonBtn.disabled = false;
        }
    });

    clearCmdBtn.addEventListener('click', async function () {
        try {
            const response = await fetch('/api/clear_cmd', {
                method: 'POST'
            });

            const result = await response.json();

            cmdOutput.innerHTML = `
                <div class="cmd-line">Windows PowerShell</div>
                <div class="cmd-line">Copyright (C) Microsoft Corporation. All rights reserved.</div>
                <div class="cmd-line"><br></div>
                <div class="cmd-line">PS C:\Users\root\Desktop\projects\web> ./start.bat</div>
                <div class="cmd-line">[SYSTEM] Инициализация web-сайта Lorazepam...</div>
                <div class="cmd-line">[SYSTEM] Загрузка модулей: COMPLETE</div>
                <div class="cmd-line">[SYSTEM] Подключение к базе данных: COMPLETE</div>
                <div class="cmd-line">[SYSTEM] Введите российский номер телефона</div>
                <div class="cmd-line"><br></div>
            `;

            lastApiResponse = null;
            saveTxtBtn.disabled = true;
            saveJsonBtn.disabled = true;

            const infoLine = document.createElement('div');
            infoLine.className = 'cmd-line api-success';
            infoLine.innerHTML = `[INFO] CMD очищен`;
            cmdOutput.appendChild(infoLine);

            inputValue = '';
            setTimeout(() => createInputLine(), 100);

            cmdBody.scrollTop = cmdBody.scrollHeight;
        } catch (error) {
            const errorLine = document.createElement('div');
            errorLine.className = 'cmd-line api-error';
            errorLine.innerHTML = '[ERROR] Ошибка очистки CMD';
            cmdOutput.appendChild(errorLine);
            cmdBody.scrollTop = cmdBody.scrollHeight;
        }
    });

    function initCmd() {
        createInputLine();

        cmdBody.addEventListener('click', function () {
            if (currentInput) {
                currentInput.focus();
            }
        });

        cmdBody.scrollTop = cmdBody.scrollHeight;
    }

    initCmd();
});