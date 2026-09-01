/* ==========================================================================
   NABIL PROFILE — PREMIUM INTERACTIONS
   Single rAF loop, no layout-thrash, production-quality audio player.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* -----------------------------------------------------------------------
       0. CAPABILITY FLAGS
    ----------------------------------------------------------------------- */
    const isMobile       = window.matchMedia("(max-width: 600px)").matches;
    const isCoarse       = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const enablePointerFX = !isMobile && !isCoarse && !prefersReduced;

    /* -----------------------------------------------------------------------
       1. SHARED POINTER + rAF LOOP
    ----------------------------------------------------------------------- */
    const pointer    = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const frameTasks = [];

    if (enablePointerFX) {
        window.addEventListener("mousemove", (e) => {
            pointer.x = e.clientX;
            pointer.y = e.clientY;
        }, { passive: true });

        (function tick() {
            frameTasks.forEach((fn) => fn());
            requestAnimationFrame(tick);
        })();
    }

    /* -----------------------------------------------------------------------
       2. CUSTOM CURSOR (rAF-driven, no .animate() storm)
    ----------------------------------------------------------------------- */
    const cursorDot  = document.querySelector(".cursor-dot");
    const cursorRing = document.querySelector(".cursor-ring");

    if (enablePointerFX && cursorDot && cursorRing) {
        let ringX = pointer.x, ringY = pointer.y;

        frameTasks.push(() => {
            cursorDot.style.transform =
                `translate(${pointer.x}px, ${pointer.y}px) translate(-50%, -50%)`;

            ringX += (pointer.x - ringX) * 0.15;
            ringY += (pointer.y - ringY) * 0.15;
            cursorRing.style.transform =
                `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
        });

        document.querySelectorAll("a, button, .gallery-item").forEach((el) => {
            el.addEventListener("mouseenter", () => cursorRing.classList.add("cursor-hover"));
            el.addEventListener("mouseleave", () => cursorRing.classList.remove("cursor-hover"));
        });
    } else {
        cursorDot  && (cursorDot.style.display  = "none");
        cursorRing && (cursorRing.style.display = "none");
    }

    /* -----------------------------------------------------------------------
       3. NAVIGATION SCROLL STATE
    ----------------------------------------------------------------------- */
    const nav = document.querySelector(".profile-nav");
    window.addEventListener("scroll", () => {
        nav && nav.classList.toggle("scrolled", window.scrollY > 60);
    }, { passive: true });

    /* -----------------------------------------------------------------------
       4. SCROLL REVEAL (single shared IntersectionObserver)
    ----------------------------------------------------------------------- */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");

            // Trigger skill bars when skills section enters view
            if (entry.target.classList.contains("skills-section")) {
                entry.target.querySelectorAll(".skill-fill").forEach((fill) => {
                    fill.style.width = fill.getAttribute("data-target");
                });
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.18,
        rootMargin: "0px 0px -80px 0px",
    });

    document.querySelectorAll(".fade-up, .story-text, .skills-section").forEach((el) => {
        revealObserver.observe(el);
    });

    /* -----------------------------------------------------------------------
       5. DVD EASTER EGG
       Starts when audio plays, pauses when audio pauses.
    ----------------------------------------------------------------------- */
    const dvdContainer = document.getElementById("dvd-container");
    const dvdLogo      = document.getElementById("dvd-logo");
    let dvdX = 30, dvdY = 30;
    let dirX = 2.2, dirY = 1.8;
    let dvdAnimId = null;

    const dvdColors = ["#E05800", "#F5E0C3", "#7A6B5C", "#00E5FF", "#7C3AED"];

    function changeColor() {
        const c = dvdColors[Math.floor(Math.random() * dvdColors.length)];
        dvdLogo.style.color       = c;
        dvdLogo.style.borderColor = c;
        dvdLogo.style.textShadow  = `0 0 12px ${c}`;
        dvdLogo.style.boxShadow   = `inset 0 0 20px ${c}33, 0 0 20px ${c}33`;
    }

    function animateDVD() {
        if (!dvdContainer || !dvdLogo) return;
        const box  = dvdContainer.getBoundingClientRect();
        const logo = dvdLogo.getBoundingClientRect();

        dvdX += dirX;
        dvdY += dirY;

        if (dvdX + logo.width >= box.width  || dvdX <= 0) { dirX *= -1; changeColor(); }
        if (dvdY + logo.height >= box.height || dvdY <= 0) { dirY *= -1; changeColor(); }

        dvdLogo.style.transform = `translate(${dvdX}px, ${dvdY}px)`;
        dvdAnimId = requestAnimationFrame(animateDVD);
    }

    /* -----------------------------------------------------------------------
       6. AUDIO PLAYER — PREMIUM VERSION
       Progress bar (seekable), current/duration time, volume, vinyl spin,
       waveform equalizer, play/pause with all visual states synced.
    ----------------------------------------------------------------------- */
    const audio         = document.getElementById("bgm-audio");
    const playBtn       = document.getElementById("play-btn");
    const albumArt      = document.getElementById("album-art");
    const waveform      = document.getElementById("waveform");
    const progressTrack = document.getElementById("progress-track");
    const progressFill  = document.getElementById("progress-fill");
    const timeCurrent   = document.getElementById("time-current");
    const timeEnd       = document.getElementById("time-end");
    const volumeSlider  = document.getElementById("volume-slider");
    const volumeIcon    = document.getElementById("volume-icon");
    const playerCard    = document.getElementById("audio-player-container");

    // Mini-player
    const miniPlayer  = document.getElementById("mini-player");
    const miniPlayBtn = document.getElementById("mini-play-btn");
    const miniWave    = document.getElementById("mini-waveform");

    let isPlaying = false;

    // Format seconds → "M:SS"
    function formatTime(secs) {
        if (!isFinite(secs) || secs < 0) return "0:00";
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    }

    // Enter playing state
    function enterPlayingState() {
        isPlaying = true;
        playBtn.classList.add("is-playing");
        playBtn.setAttribute("aria-label", "Pause");

        albumArt.classList.add("playing");
        albumArt.classList.remove("paused-spin");
        waveform.classList.add("playing");
        playerCard && playerCard.classList.add("playing");

        // Mini-player
        miniPlayBtn && (miniPlayBtn.textContent = "⏸");
        miniWave && miniWave.classList.add("playing");

        // DVD
        if (!dvdAnimId) animateDVD();
        else cancelAnimationFrame(dvdAnimId), (dvdAnimId = null), animateDVD();
    }

    // Enter paused state
    function enterPausedState() {
        isPlaying = false;
        playBtn.classList.remove("is-playing");
        playBtn.setAttribute("aria-label", `Play ${audio.title || "track"}`);

        albumArt.classList.remove("playing");
        albumArt.classList.add("paused-spin");
        waveform.classList.remove("playing");
        playerCard && playerCard.classList.remove("playing");

        // Mini-player
        miniPlayBtn && (miniPlayBtn.textContent = "▶");
        miniWave && miniWave.classList.remove("playing");

        // Stop DVD
        if (dvdAnimId) { cancelAnimationFrame(dvdAnimId); dvdAnimId = null; }
    }

    // Toggle play/pause (shared between main and mini button)
    function togglePlayback() {
        if (!audio) return;
        if (!isPlaying) {
            audio.play()
                .then(enterPlayingState)
                .catch((err) => console.error("Playback failed:", err));
        } else {
            audio.pause();
            enterPausedState();
        }
    }

    // Wire buttons
    playBtn    && playBtn.addEventListener("click", togglePlayback);
    miniPlayBtn && miniPlayBtn.addEventListener("click", togglePlayback);

    // Audio error debug
    audio && audio.addEventListener("error", () => {
        console.error("Audio failed to load:", audio.currentSrc || audio.src);
    });

    // Duration loaded
    audio && audio.addEventListener("loadedmetadata", () => {
        timeEnd && (timeEnd.textContent = formatTime(audio.duration));
    });

    // Auto-reset UI when track ends
    audio && audio.addEventListener("ended", enterPausedState);

    /* ---- Progress bar update (timeupdate) ---- */
    audio && audio.addEventListener("timeupdate", () => {
        if (!audio.duration) return;
        const pct = (audio.currentTime / audio.duration) * 100;

        if (progressFill) progressFill.style.width = `${pct}%`;
        if (progressTrack) progressTrack.setAttribute("aria-valuenow", Math.round(pct));
        if (timeCurrent) timeCurrent.textContent = formatTime(audio.currentTime);
    });

    /* ---- Progress bar seek (click + drag) ---- */
    if (progressTrack && audio) {
        let seeking = false;

        function seek(clientX) {
            const rect = progressTrack.getBoundingClientRect();
            const pct  = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            audio.currentTime = pct * audio.duration;
        }

        progressTrack.addEventListener("mousedown", (e) => {
            seeking = true;
            seek(e.clientX);
        });

        window.addEventListener("mousemove", (e) => {
            if (seeking) seek(e.clientX);
        });

        window.addEventListener("mouseup", () => { seeking = false; });

        // Touch support
        progressTrack.addEventListener("touchstart", (e) => {
            seeking = true;
            seek(e.touches[0].clientX);
        }, { passive: true });

        window.addEventListener("touchmove", (e) => {
            if (seeking) seek(e.touches[0].clientX);
        }, { passive: true });

        window.addEventListener("touchend", () => { seeking = false; });

        // Keyboard (arrow keys on focused track)
        progressTrack.addEventListener("keydown", (e) => {
            if (!audio.duration) return;
            if (e.key === "ArrowRight") audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
            if (e.key === "ArrowLeft")  audio.currentTime = Math.max(0,              audio.currentTime - 5);
        });
    }

    /* ---- Volume slider ---- */
    if (volumeSlider && audio) {
        volumeSlider.addEventListener("input", () => {
            const v = parseFloat(volumeSlider.value);
            audio.volume = v;
            if (volumeIcon) {
                volumeIcon.textContent = v === 0 ? "🔇" : v < 0.5 ? "🔉" : "🔊";
            }
        });
    }

    /* -----------------------------------------------------------------------
       7. STICKY MINI-PLAYER (IntersectionObserver on song section)
    ----------------------------------------------------------------------- */
    const songSection = document.getElementById("song-section");

    if (miniPlayer && songSection) {
        const miniObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                miniPlayer.classList.toggle("visible", !entry.isIntersecting);
            });
        }, { threshold: 0.1 });

        miniObserver.observe(songSection);
    }

    /* -----------------------------------------------------------------------
       8. AUTO-SYNC LYRICS (.lrc PARSER)
       Parses standard LRC format including multi-timestamp lines.
       Active lyric glows; near lines fade with depth layering.
    ----------------------------------------------------------------------- */
    const lyricsContainer = document.getElementById("lyrics-container");
    let lyricLines = [];

    async function fetchAndParseLyrics() {
        try {
            const response = await fetch("assets/lyrics/Tulus - Teh Hijau.lrc");
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const lrcText = await response.text();

            const timeTagRegex = /\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\]/g;
            const entries = [];

            lrcText.split("\n").forEach((line) => {
                const tags = [...line.matchAll(timeTagRegex)];
                if (!tags.length) return;
                const text = line.replace(timeTagRegex, "").trim();
                if (!text) return;

                tags.forEach((tag) => {
                    entries.push({
                        time: parseInt(tag[1]) * 60 + parseFloat(tag[2]),
                        text,
                    });
                });
            });

            entries.sort((a, b) => a.time - b.time);

            entries.forEach((entry) => {
                const p = document.createElement("p");
                p.className = "lyric-line";
                p.dataset.time = entry.time;
                p.textContent  = entry.text;
                lyricsContainer.appendChild(p);
            });

            lyricLines = lyricsContainer.querySelectorAll(".lyric-line");

        } catch (err) {
            console.error("Lyrics load failed:", err);
            if (lyricsContainer) {
                lyricsContainer.innerHTML = "<p class='lyric-line active'>♪ Lyrics not found</p>";
            }
        }
    }

    if (lyricsContainer) fetchAndParseLyrics();

    /* ---- timeupdate: highlight active lyric with depth layers ---- */
    if (audio && lyricsContainer) {
        audio.addEventListener("timeupdate", () => {
            const t = audio.currentTime;
            let activeIdx = -1;

            for (let i = 0; i < lyricLines.length; i++) {
                if (t >= parseFloat(lyricLines[i].dataset.time)) {
                    activeIdx = i;
                } else {
                    break;
                }
            }

            lyricLines.forEach((line, i) => {
                const dist = Math.abs(i - activeIdx);
                line.classList.remove("active", "lyric-line--near", "lyric-line--far");

                if (i === activeIdx) {
                    line.classList.add("active");
                    // Center the active lyric vertically
                    const offset = line.offsetTop + line.offsetHeight / 2;
                    lyricsContainer.style.transform = `translateY(-${offset}px)`;
                } else if (dist === 1) {
                    line.classList.add("lyric-line--near");
                } else if (dist === 2) {
                    line.classList.add("lyric-line--far");
                }
            });
        });
    }

    /* -----------------------------------------------------------------------
       9. MAGNETIC CONTACT BUTTON
    ----------------------------------------------------------------------- */
    const magnetBtn = document.querySelector(".magnetic-btn");

    if (enablePointerFX && magnetBtn) {
        let pulling = false;

        magnetBtn.addEventListener("mouseenter", () => { pulling = true; });
        magnetBtn.addEventListener("mouseleave", () => {
            pulling = false;
            magnetBtn.style.transform = "";
        });

        frameTasks.push(() => {
            if (!pulling) return;
            const rect = magnetBtn.getBoundingClientRect();
            const relX = pointer.x - (rect.left + rect.width  / 2);
            const relY = pointer.y - (rect.top  + rect.height / 2);
            magnetBtn.style.transform = `translate(${relX * 0.2}px, ${relY * 0.2}px)`;
        });
    }

});
