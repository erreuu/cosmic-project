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
        if (miniBtn)  miniBtn.innerHTML = playing
            ? '<svg class="mini-icon mini-icon--pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
            : '<svg class="mini-icon mini-icon--play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v14l11-7-11-7z"/></svg>';
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
                const v = audio.volume;
                if (v === 0) {
                    volumeIconEl.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18l2 2L21 18.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
                } else if (v < 0.5) {
                    volumeIconEl.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18.5 12A4.5 4.5 0 0 0 16 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>';
                } else {
                    volumeIconEl.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>';
                }
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
           Source: assets/lyrics/The Neighbourhood - Softcore.lrc
    ----------------------------------------------------------------------- */
    let lrcLines = [];
    let activeIndex = -1;
    const lyricsContainer = document.getElementById("lyrics-container");

    // LRC data embedded inline — no fetch() required.
    const EMBEDDED_LRC = `
[00:21.08]You've been my muse for a long time
[00:26.18]You get me through every dark night
[00:30.99]I'm always gone, out on the go
[00:33.54]I'm on the run and you're home alone
[00:36.43]I'm too consumed with my own life
[00:42.86]Are we too young for this?
[00:47.60]Feels like I can't move
[00:50.36]Sharing my heart
[00:52.24]It's tearing me apart
[00:54.28]But I know I'd miss you, baby, if I left right now
[01:00.67]Doing what I can
[01:02.55]Tryna be a man
[01:04.36]And every time I kiss you, baby
[01:06.16]I can hear the sound of breaking down
[01:22.34]I've been confused as of late
[01:27.47]Watching my youth slip away
[01:32.25]You're like the sun, you wake me up
[01:34.73]But you drain me out if I get too much
[01:37.70]I might need room or I'll break
[01:44.08]Are we too young for this?
[01:48.87]Feels like I can't move
[01:51.68]Sharing my heart
[01:53.49]It's tearing me apart
[01:55.53]But I know I'd miss you, baby, if I left right now
[02:01.97]Doing what I can
[02:03.84]Tryna be a man
[02:05.64]And every time I kiss you, baby
[02:07.45]I can hear the sound of breaking down
[02:23.03]I don't want to play this part
[02:27.53]But I do, all for you
[02:33.22]I don't want to make this hard
[02:37.72]But I will 'cause I'm still
[02:42.78]Sharing my heart
[02:44.58]It's tearing me apart
[02:46.64]But I know I'd miss you, baby, if I left right now
[02:53.02]Doing what I can
[02:54.90]Tryna be a man
[02:56.75]And every time I kiss you, baby
[02:58.51]I can hear the sound of breaking down
[03:05.09]Sharing my bed, I'm
[03:07.66]Sharing my bread, yeah
[03:10.19]Sharing my bread
[03:12.79]Sharing my head
[03:15.27]Sharing my heart
[03:17.82]Sharing my shine
[03:20.45]Sharing, I'm done
[03:22.88]Sharing my life
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
