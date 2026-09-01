/* ==========================================================================
   NABIL PROFILE — DOODLE SKETCHBOOK INTERACTIONS
   Preserves all audio/LRC logic. Adds: parallax, bg journey, scroll bar,
   section counter, hero char trigger, draw-path reveals.
   Single rAF loop, no layout thrash, no external dependencies.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* -----------------------------------------------------------------------
       0. CAPABILITY FLAGS
    ----------------------------------------------------------------------- */
    const isMobile        = window.matchMedia("(max-width: 600px)").matches;
    const isCoarse        = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const prefersReduced  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
       2. CUSTOM CURSOR
    ----------------------------------------------------------------------- */
    const cursorDot  = document.querySelector(".cursor-dot");
    const cursorRing = document.querySelector(".cursor-ring");

    if (enablePointerFX && cursorDot && cursorRing) {
        let dotX = pointer.x, dotY = pointer.y;
        let ringX = pointer.x, ringY = pointer.y;

        frameTasks.push(() => {
            dotX  += (pointer.x - dotX)  * 0.85;
            dotY  += (pointer.y - dotY)  * 0.85;
            ringX += (pointer.x - ringX) * 0.12;
            ringY += (pointer.y - ringY) * 0.12;

            cursorDot.style.transform  = `translate(${dotX - 2.5}px, ${dotY - 2.5}px)`;
            cursorRing.style.transform = `translate(${ringX - 15}px, ${ringY - 15}px)`;
        });

        // Hover state on interactive elements
        document.querySelectorAll("a, button, input, [role='slider'], .polaroid, .play-btn")
            .forEach((el) => {
                el.addEventListener("mouseenter", () => cursorRing.classList.add("cursor-hover"));
                el.addEventListener("mouseleave", () => cursorRing.classList.remove("cursor-hover"));
            });
    }

    /* -----------------------------------------------------------------------
       3. NAVIGATION — glass on scroll
    ----------------------------------------------------------------------- */
    const nav = document.querySelector(".profile-nav");
    window.addEventListener("scroll", () => {
        if (nav) nav.classList.toggle("scrolled", window.scrollY > 60);
    }, { passive: true });

    /* -----------------------------------------------------------------------
       4. PARALLAX DOODLE LAYERS (adapted from Horizon Hero technique)
          Three layers at different speeds create perceived depth.
          Lerp-smoothed inside rAF loop.
    ----------------------------------------------------------------------- */
    if (!prefersReduced) {
        const parallaxConfig = [
            { selector: ".doodle-layer--slow", speed: 0.06 },
            { selector: ".doodle-layer--mid",  speed: 0.18 },
            { selector: ".doodle-layer--fast", speed: 0.32 },
        ];

        const parallaxLayers = parallaxConfig
            .map(({ selector, speed }) => {
                const el = document.querySelector(selector);
                return el ? { el, speed, y: 0 } : null;
            })
            .filter(Boolean);

        let scrollYTarget = 0;
        window.addEventListener("scroll", () => {
            scrollYTarget = window.scrollY;
        }, { passive: true });

        if (parallaxLayers.length > 0) {
            frameTasks.push(() => {
                parallaxLayers.forEach((layer) => {
                    const targetY = scrollYTarget * layer.speed;
                    layer.y += (targetY - layer.y) * 0.06;
                    layer.el.style.transform = `translateY(-${layer.y}px)`;
                });
            });
        }
    }

    /* -----------------------------------------------------------------------
       5. BACKGROUND COLOUR JOURNEY
          Body background shifts through the blue palette as the user scrolls
          through sections — mirrors the Horizon Hero camera journey concept.
    ----------------------------------------------------------------------- */
    const bgJourneyColors = [
        "#e8f4fd", // 1. Hero      — bright sky
        "#eef7fd", // 2. Intro     — soft paper sky
        "#f2f8ff", // 3. Story     — near white
        "#f7faff", // 4. Skills    — light paper
        "#eef6fc", // 5. Music     — soft blue
        "#e6f0f9", // 6. Lyrics    — deeper blue
        "#dce9f5", // 7. DVD       — dusk blue
        "#d4e4f2", // 8. Quote     — quiet evening
        "#e2eef8", // 9. Gallery   — paper again
        "#f5f9ff", // 10. Contact  — clean close
    ];

    const sectionIds = [
        "section-hero", "section-intro", "section-story", "section-skills",
        "song-section", "lyrics-section", "dvd-container",
        "section-quote", "section-gallery", "section-contact",
    ];

    const totalSections = sectionIds.length;

    function setBgColor(index) {
        const color = bgJourneyColors[Math.max(0, Math.min(index, bgJourneyColors.length - 1))];
        document.body.style.backgroundColor = color;
    }

    /* -----------------------------------------------------------------------
       6. SCROLL PROGRESS BAR + SECTION COUNTER
    ----------------------------------------------------------------------- */
    const scrollBarEl = document.getElementById("scroll-bar");
    const scrollFill  = document.getElementById("scroll-fill");
    const counterEl   = document.getElementById("scroll-counter");

    function updateScrollBar() {
        const scrollY    = window.scrollY;
        const maxScroll  = document.documentElement.scrollHeight - window.innerHeight;
        const pct        = maxScroll > 0 ? Math.min(scrollY / maxScroll, 1) * 100 : 0;

        if (scrollFill) scrollFill.style.width = `${pct}%`;
        if (scrollBarEl) scrollBarEl.classList.toggle("visible", scrollY > 120);
    }

    window.addEventListener("scroll", updateScrollBar, { passive: true });

    /* Section observer — updates counter + background */
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const idx = sectionIds.indexOf(entry.target.id);
                if (idx !== -1) {
                    if (counterEl) {
                        counterEl.textContent =
                            `${String(idx + 1).padStart(2, "0")} / ${String(totalSections).padStart(2, "0")}`;
                    }
                    setBgColor(idx);
                }
            }
        });
    }, { threshold: 0.45 });

    sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) sectionObserver.observe(el);
    });

    /* -----------------------------------------------------------------------
       7. HERO — DRAW-PATH + UNDERLINE TRIGGER ON LOAD
    ----------------------------------------------------------------------- */
    if (!prefersReduced) {
        setTimeout(() => {
            document.querySelectorAll(".hero-underline.draw-path").forEach((el) => {
                el.classList.add("is-visible");
            });
        }, 900);
    } else {
        document.querySelectorAll(".draw-path").forEach((el) => el.classList.add("is-visible"));
    }

    /* -----------------------------------------------------------------------
       8. SCROLL REVEAL — IntersectionObserver fallback
          Only applies when native CSS scroll-driven animations aren't supported.
          Feature-detected via @supports check mirrored in JS.
    ----------------------------------------------------------------------- */
    // Feature detect: mirrors the CSS @supports guard exactly
    const supportsScrollDriven =
        CSS.supports("(animation-timeline: scroll()) and (animation-range: 0% 100%)");

    if (!supportsScrollDriven) {
        const revealEls = document.querySelectorAll(".reveal-up");
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12 });
        revealEls.forEach((el) => revealObserver.observe(el));

        // Quote section fallback
        const quoteSec = document.getElementById("section-quote");
        if (quoteSec) {
            const quoteObs = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        quoteSec.classList.add("is-visible");
                        quoteObs.unobserve(quoteSec);
                    }
                });
            }, { threshold: 0.3 });
            quoteObs.observe(quoteSec);
        }
    }

    /* Draw-path elements (not hero underline — those are above) */
    const drawPathEls = document.querySelectorAll(".draw-path:not(.hero-underline)");
    const drawObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                drawObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    drawPathEls.forEach((el) => drawObserver.observe(el));

    /* -----------------------------------------------------------------------
       9. STORY TEXT HIGHLIGHT REVEAL
    ----------------------------------------------------------------------- */
    const storyText = document.getElementById("story-text");
    if (storyText) {
        const storyObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    storyText.classList.add("is-visible");
                    storyObserver.unobserve(storyText);
                }
            });
        }, { threshold: 0.3 });
        storyObserver.observe(storyText);
    }

    /* -----------------------------------------------------------------------
       10. SKILL BARS (IntersectionObserver — fill animates on enter)
    ----------------------------------------------------------------------- */
    const skillsSection = document.querySelector(".skills-section");
    if (skillsSection) {
        const skillObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.querySelectorAll(".skill-fill").forEach((fill) => {
                        const target = fill.dataset.target || "0%";
                        setTimeout(() => {
                            fill.style.width = target;
                        }, 200);
                    });
                    skillObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.35 });
        skillObserver.observe(skillsSection);
    }

    /* -----------------------------------------------------------------------
       11. AUDIO PLAYER — fully preserved, recoloured to blue palette
    ----------------------------------------------------------------------- */
    const audio        = document.getElementById("bgm-audio");
    const playBtn      = document.getElementById("play-btn");
    const progressTrack = document.getElementById("progress-track");
    const progressFill  = document.getElementById("progress-fill");
    const timeCurrentEl = document.getElementById("time-current");
    const timeEndEl     = document.getElementById("time-end");
    const waveformEl    = document.getElementById("waveform");
    const albumArt      = document.getElementById("album-art");
    const playerContainer = document.getElementById("audio-player-container");
    const volumeSlider  = document.getElementById("volume-slider");
    const volumeIconEl  = document.getElementById("volume-icon");

    if (!audio || !playBtn) return; // guard: leave if player not found

    let isPlaying = false;
    let seekDragging = false;
    let hasPreviouslyPlayed = false;  // guard: paused-spin only after first play

    function formatTime(s) {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, "0")}`;
    }

    function setPlayingState(playing) {
        isPlaying = playing;
        if (playing) hasPreviouslyPlayed = true;

        playBtn.classList.toggle("is-playing", playing);

        if (albumArt) {
            if (playing) {
                albumArt.classList.add("playing");
                albumArt.classList.remove("paused-spin");
            } else if (hasPreviouslyPlayed) {
                // Keep .playing to hold the animation, add paused-spin to freeze it
                albumArt.classList.add("paused-spin");
            }
        }

        if (waveformEl)      waveformEl.classList.toggle("playing", playing);
        if (playerContainer) playerContainer.classList.toggle("playing", playing);

        // Mini-player waveform sync
        const miniWave = document.getElementById("mini-waveform");
        const miniBtn  = document.getElementById("mini-play-btn");
        if (miniWave) miniWave.classList.toggle("playing", playing);
        if (miniBtn)  miniBtn.textContent = playing ? "⏸" : "▶";
    }

    // Play / Pause button
    playBtn.addEventListener("click", () => {
        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(() => {});
        }
    });

    audio.addEventListener("play",  () => setPlayingState(true));
    audio.addEventListener("pause", () => setPlayingState(false));
    audio.addEventListener("ended", () => setPlayingState(false));

    // Metadata loaded — show duration
    audio.addEventListener("loadedmetadata", () => {
        if (timeEndEl) timeEndEl.textContent = formatTime(audio.duration);
    });

    // Time update — progress bar + lyrics sync
    audio.addEventListener("timeupdate", () => {
        if (!audio.duration || seekDragging) return;

        const pct = audio.currentTime / audio.duration;
        if (progressFill) progressFill.style.width = `${pct * 100}%`;
        if (progressTrack) progressTrack.setAttribute("aria-valuenow", Math.round(pct * 100));
        if (timeCurrentEl) timeCurrentEl.textContent = formatTime(audio.currentTime);

        updateLyrics(audio.currentTime);
    });

    // Seek — click on progress track
    if (progressTrack) {
        const seek = (e) => {
            const rect = progressTrack.getBoundingClientRect();
            const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            audio.currentTime = pct * (audio.duration || 0);
        };

        progressTrack.addEventListener("mousedown", (e) => {
            seekDragging = true;
            seek(e);
        });
        window.addEventListener("mousemove", (e) => {
            if (seekDragging) seek(e);
        });
        window.addEventListener("mouseup", () => {
            seekDragging = false;
        });

        progressTrack.addEventListener("touchstart", (e) => {
            seekDragging = true;
            seek(e.touches[0]);
        }, { passive: true });
        window.addEventListener("touchmove", (e) => {
            if (seekDragging) seek(e.touches[0]);
        }, { passive: true });
        window.addEventListener("touchend", () => {
            seekDragging = false;
        });

        // Keyboard seek
        progressTrack.addEventListener("keydown", (e) => {
            const step = audio.duration * 0.02;
            if (e.key === "ArrowRight") audio.currentTime = Math.min(audio.currentTime + step, audio.duration);
            if (e.key === "ArrowLeft")  audio.currentTime = Math.max(audio.currentTime - step, 0);
        });
    }

    // Volume
    if (volumeSlider) {
        volumeSlider.addEventListener("input", () => {
            audio.volume = parseFloat(volumeSlider.value);
            if (volumeIconEl) {
                volumeIconEl.textContent = audio.volume === 0 ? "🔇" : audio.volume < 0.5 ? "🔈" : "🔉";
            }
        });
    }

    /* -----------------------------------------------------------------------
       12. MINI-PLAYER — appears when song section leaves viewport
    ----------------------------------------------------------------------- */
    const miniPlayer  = document.getElementById("mini-player");
    const miniPlayBtn = document.getElementById("mini-play-btn");
    const songSection = document.getElementById("song-section");

    if (miniPlayBtn) {
        miniPlayBtn.addEventListener("click", () => {
            if (isPlaying) audio.pause();
            else audio.play().catch(() => {});
        });
    }

    if (miniPlayer && songSection) {
        const miniObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                miniPlayer.classList.toggle("visible", !entry.isIntersecting);
            });
        }, { threshold: 0.1 });
        miniObserver.observe(songSection);
    }

    /* -----------------------------------------------------------------------
       13. LRC LYRICS PARSER + SYNC
           Lyrics are embedded directly to avoid fetch/CORS/file:// failures.
           Source: assets/lyrics/Red Velvet - Underwater.lrc
    ----------------------------------------------------------------------- */
    let lrcLines = [];
    let activeIndex = -1;
    const lyricsContainer = document.getElementById("lyrics-container");

    // LRC data embedded inline — no fetch() required.
    const EMBEDDED_LRC = `
[00:00.00]Yeah, All I need for you's to stay
[00:08.30]And forever, you will sway
[00:14.32]They can't love you like I love you
[00:17.16]geumse sarajyeo geu padong modu
[00:20.89]amu heunjeokdo namgiji mothan chae
[00:24.00]ani cheoeumbuteo eopseotdeon iri dwae
[00:27.81]aju gipeun Underwater
[00:29.79]ije nuneul tteodo dwae
[00:31.85]ontong neol hwigama
[00:33.20]yeogin neoman heorakae nan
[00:35.42]jigeum gamssaoneun
[00:37.15]gamgakdeureul gieokae
[00:39.64]So you can take your time
[00:41.00]Ooh, natseon ongi tteollim
[00:44.47]It's all you, you Ooh
[00:48.81]neoreul kkaeun gamjeong
[00:51.69]geu jeonbu True
[00:55.49]I can't wait, Babe
[00:57.59]What's it gonna be?
[00:59.46]What's it gonna be, Babe?
[01:00.84]You should show me
[01:03.04]neon heumppeok jamgyeo naege gipi
[01:06.45]mam kkeutkkaji, Babe, chaoreuji
[01:10.08]neoreul matgyeodo dwae ikkeullyeo jungnyeoge
[01:14.49]nal deo wonhage dwae (Ooh)
[01:16.55]goyohage heulleodeureo binteumeopsi
[01:20.17]nae aneseo sumeul swil su inneun geol, Ooh
[01:26.32]Who can love you like I love you?
[01:29.76]pogeunhago adeukan i dankkum
[01:33.32]Come here, Babe
[01:35.91]jeoldaero mareuji aneuni (Ooh)
[01:39.08]kkamadeukan Underwater
[01:40.56]eotteon naega gunggeumhae?
[01:42.73]eodideunji yuyuhi
[01:44.48]deo heeomchyeodo dwae neon
[01:46.96]amu gyeonggye eopsi
[01:48.14]chumeul chudeut geureoke
[01:50.28]So you can take your time
[01:52.61]Ooh, yeongwon soge
[01:55.20]meomchun deuthan View, view (It is all you)
[02:00.09]naega kkaeun gamjeong
[02:02.33]geu jeonbu True
[02:06.54]I can't wait, Babe
[02:07.72]What's it gonna be?
[02:09.93]What's it gonna be, Babe?
[02:11.83]You should show me (Show me, Yeah)
[02:14.02]neon heumppeok jamgyeo
[02:15.87]naege gipi (neon naege gipi)
[02:17.38]mam kkeutkkaji, Babe
[02:19.30]chaoreuji (Ooh, chaoreuji)
[02:21.10]neoreul matgyeodo dwae ikkeullyeo jungnyeoge
[02:25.23]nal deo wonhage dwae (nal gyesok wonhage dwae)
[02:27.25]goyohage heulleodeureo binteumeopsi
[02:30.82]nae aneseo sumeul swil su inneun geol, Ooh
[02:35.70]Way up and down (Up and down)
[02:37.49]Go round and round (Round and round)
[02:39.29]neon heeonal mam eopseo
[02:40.39]dasi Stay around (Stay around)
[02:42.72]I want you no one else
[02:45.08]Just come lay your body on me
[02:49.33]You can't wait, Babe
[02:50.46]What's it gonna be? (What's it gonna be?)
[02:52.53]What's it gonna be, Babe?
[02:54.36]You should show me (You should show me)
[02:56.29]neon hansungane
[02:57.97]naege gipi (hansungane, Babe)
[02:59.60]mam kkeutkkaji, Babe, gadeukaji
[03:03.24]jeonbu matgyeodo dwae hangyee daeul ttae (Ooh)
[03:07.80]kkeuteopsi nal wonhae (wonhae neon kkeuteopsi)
[03:10.80]ne mamsogeul pagodeureo binteumeopsi
[03:13.61]neon naraneun sumeul swige doeneun geol, Ooh
`;

    lrcLines = parseLRC(EMBEDDED_LRC);
    if (lyricsContainer && lrcLines.length) renderLyrics();

    function parseLRC(text) {
        const lineRx = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
        return text
            .split("\n")
            .map((line) => {
                const m = line.match(lineRx);
                if (!m) return null;
                const time = parseInt(m[1]) * 60 + parseFloat(m[2] + "." + m[3]);
                return { time, text: m[4].trim() };
            })
            .filter(Boolean)
            .sort((a, b) => a.time - b.time);
    }

    function renderLyrics() {
        lyricsContainer.innerHTML = "";
        lrcLines.forEach((line, i) => {
            const p = document.createElement("p");
            p.className = "lyric-line";
            p.textContent = line.text || "♪";
            p.dataset.index = i;
            lyricsContainer.appendChild(p);
        });
        // Apply initial classes immediately so lyrics are visible before playback.
        // Without this, every line stays at opacity 0.08 + blur(4px) until the
        // first timeupdate event fires (which requires the user to press Play).
        updateLyrics(0);
    }

    function updateLyrics(currentTime) {
        if (!lrcLines.length || !lyricsContainer) return;

        let newIndex = 0;
        for (let i = 0; i < lrcLines.length; i++) {
            if (lrcLines[i].time <= currentTime) newIndex = i;
            else break;
        }

        if (newIndex === activeIndex) return;
        activeIndex = newIndex;

        const lines = lyricsContainer.querySelectorAll(".lyric-line");
        lines.forEach((el, i) => {
            el.className = "lyric-line";
            const diff = i - activeIndex;
            if (diff === 0)             el.classList.add("active");
            else if (Math.abs(diff) === 1) el.classList.add("lyric-line--near");
            else if (Math.abs(diff) <= 3)  el.classList.add("lyric-line--far");
        });

        // Scroll the active lyric line to the vertical centre of the wrapper.
        // Use the element's real offsetTop so the position is always exact,
        // regardless of actual font size, margin, or viewport width.
        const activeEl = lyricsContainer.querySelectorAll(".lyric-line")[activeIndex];
        const wrapper  = lyricsContainer.parentElement;
        if (activeEl && wrapper) {
            const lineMidpoint  = activeEl.offsetTop + activeEl.offsetHeight / 2;
            const wrapperCenter = wrapper.offsetHeight / 2;
            lyricsContainer.style.transform = `translateY(${wrapperCenter - lineMidpoint}px)`;
        }
    }

    /* -----------------------------------------------------------------------
       14. DVD EASTER EGG — bouncing logo
    ----------------------------------------------------------------------- */
    const dvdLogo      = document.getElementById("dvd-logo");
    const dvdContainer = document.getElementById("dvd-container");

    if (dvdLogo && dvdContainer) {
        const dvdColors = [
            "#5ba4d4", "#3b8ec8", "#7bbfde",
            "#2a7ab0", "#4096c8", "#1e5fa0",
        ];
        let dvdX = 80, dvdY = 80, dvdVX = 1.5, dvdVY = 1.2;
        let dvdColorIdx = 0;

        function dvdTick() {
            if (!isPlaying) {
                requestAnimationFrame(dvdTick);
                return;
            }

            const cw  = dvdContainer.offsetWidth;
            const ch  = dvdContainer.offsetHeight;
            const lw  = dvdLogo.offsetWidth;
            const lh  = dvdLogo.offsetHeight;

            dvdX += dvdVX;
            dvdY += dvdVY;

            if (dvdX + lw >= cw) { dvdX = cw - lw; dvdVX *= -1; dvdColorIdx = (dvdColorIdx + 1) % dvdColors.length; }
            if (dvdX <= 0)        { dvdX = 0;         dvdVX *= -1; dvdColorIdx = (dvdColorIdx + 1) % dvdColors.length; }
            if (dvdY + lh >= ch)  { dvdY = ch - lh;   dvdVY *= -1; dvdColorIdx = (dvdColorIdx + 1) % dvdColors.length; }
            if (dvdY <= 0)        { dvdY = 0;          dvdVY *= -1; dvdColorIdx = (dvdColorIdx + 1) % dvdColors.length; }

            dvdLogo.style.left  = `${dvdX}px`;
            dvdLogo.style.top   = `${dvdY}px`;
            dvdLogo.style.color = dvdColors[dvdColorIdx];
            dvdLogo.style.borderColor = dvdColors[dvdColorIdx];
            dvdLogo.style.textShadow  = `0 0 12px ${dvdColors[dvdColorIdx]}aa`;

            requestAnimationFrame(dvdTick);
        }

        dvdTick();
    }

    /* -----------------------------------------------------------------------
       15. INITIAL SCROLL STATE
    ----------------------------------------------------------------------- */
    updateScrollBar();
    setBgColor(0);

}); // end DOMContentLoaded