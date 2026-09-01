/* ==========================================================================
   KELOMPOK 2 PORTFOLIO — LANDING PAGE INTERACTIONS
   Performance-first: single rAF loop, passive listeners, no layout thrash.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* -----------------------------------------------------------------------
       0. CAPABILITY FLAGS
       Check once, reuse everywhere.
    ----------------------------------------------------------------------- */
    const isMobile        = window.matchMedia("(max-width: 768px)").matches;
    const isCoarsePointer = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const prefersReduced  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const enablePointerFX = !isMobile && !isCoarsePointer && !prefersReduced;

    /* -----------------------------------------------------------------------
       1. SHARED POINTER STATE + SINGLE rAF LOOP
       All pointer-driven effects register tasks here; one rAF loop runs all.
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
       2. PARTICLE CANVAS
       ~60 floating dots with mouse-parallax depth. Pure canvas 2D —
       no library, no extra parse time. Paused if prefers-reduced-motion.
    ----------------------------------------------------------------------- */
    const canvas  = document.getElementById("particle-canvas");
    const ctx     = canvas && canvas.getContext("2d");

    if (canvas && ctx && !prefersReduced) {
        const PARTICLE_COUNT = isMobile ? 30 : 60;
        const particles = [];

        function resizeCanvas() {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas, { passive: true });

        // Build particles
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push({
                x:      Math.random() * canvas.width,
                y:      Math.random() * canvas.height,
                r:      Math.random() * 1.4 + 0.3,
                speed:  Math.random() * 0.25 + 0.05,
                alpha:  Math.random() * 0.4 + 0.1,
                depth:  Math.random() * 0.6 + 0.2,   // parallax depth factor
                drift:  (Math.random() - 0.5) * 0.3, // horizontal drift
            });
        }

        let lastPointerX = window.innerWidth / 2;
        let lastPointerY = window.innerHeight / 2;

        if (enablePointerFX) {
            frameTasks.push(() => {
                lastPointerX += (pointer.x - lastPointerX) * 0.06;
                lastPointerY += (pointer.y - lastPointerY) * 0.06;
            });
        }

        function drawParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const cx = canvas.width  / 2;
            const cy = canvas.height / 2;
            const px = enablePointerFX ? (lastPointerX - cx) * 0.03 : 0;
            const py = enablePointerFX ? (lastPointerY - cy) * 0.03 : 0;

            particles.forEach((p) => {
                // Slow upward drift
                p.y -= p.speed;
                p.x += p.drift;

                // Wrap
                if (p.y < -4)           p.y = canvas.height + 4;
                if (p.x < -4)           p.x = canvas.width  + 4;
                if (p.x > canvas.width  + 4) p.x = -4;

                const drawX = p.x + px * p.depth;
                const drawY = p.y + py * p.depth;

                ctx.beginPath();
                ctx.arc(drawX, drawY, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 229, 255, ${p.alpha})`;
                ctx.fill();
            });

            requestAnimationFrame(drawParticles);
        }

        drawParticles();
    }

    /* -----------------------------------------------------------------------
       2.5 UNIFIED SCROLL LOOP
       All scroll-driven effects register tasks here to prevent layout thrash.
    ----------------------------------------------------------------------- */
    const scrollTasks = [];
    let isScrollTicking = false;
    let lastScrollY = window.scrollY;

    window.addEventListener("scroll", () => {
        lastScrollY = window.scrollY;
        if (!isScrollTicking) {
            window.requestAnimationFrame(() => {
                scrollTasks.forEach((fn) => fn(lastScrollY));
                isScrollTicking = false;
            });
            isScrollTicking = true;
        }
    }, { passive: true });

    /* -----------------------------------------------------------------------
       3. SCROLL PROGRESS BAR
    ----------------------------------------------------------------------- */
    const progressBar = document.createElement("div");
    progressBar.className = "scroll-progress";
    progressBar.setAttribute("role", "progressbar");
    progressBar.setAttribute("aria-hidden", "true");
    document.body.appendChild(progressBar);

    scrollTasks.push((scrollY) => {
        const doc   = document.documentElement;
        const total = doc.scrollHeight - doc.clientHeight;
        progressBar.style.transform = total > 0 ? `scaleX(${scrollY / total})` : "scaleX(0)";
    });

    /* -----------------------------------------------------------------------
       4. NAVIGATION — scrolled class + scrollspy
    ----------------------------------------------------------------------- */
    const nav = document.querySelector(".glass-nav");
    let navIsScrolled = false;

    scrollTasks.push((scrollY) => {
        if (!nav) return;
        const shouldBeScrolled = scrollY > 50;
        if (navIsScrolled !== shouldBeScrolled) {
            nav.classList.toggle("scrolled", shouldBeScrolled);
            navIsScrolled = shouldBeScrolled;
        }
    });

    // Nav scrollspy
    const navLinks   = document.querySelectorAll(".nav-links a");
    const spySections = [...navLinks]
        .map((a) => document.querySelector(a.getAttribute("href")))
        .filter(Boolean);

    if (navLinks.length && spySections.length) {
        const spyObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const link = document.querySelector(
                    `.nav-links a[href="#${entry.target.id}"]`
                );
                if (link) link.classList.toggle("is-active", entry.isIntersecting);
            });
        }, { rootMargin: "-40% 0px -55% 0px" });

        spySections.forEach((s) => spyObserver.observe(s));
    }

    /* -----------------------------------------------------------------------
       5. MOBILE HAMBURGER MENU
    ----------------------------------------------------------------------- */
    const toggleBtn     = document.getElementById("nav-toggle");
    const mobileNav     = document.getElementById("mobile-nav");
    const mobileLinks   = document.querySelectorAll(".mobile-nav-link");

    function closeMenu() {
        if (!toggleBtn || !mobileNav) return;
        toggleBtn.classList.remove("open");
        mobileNav.classList.remove("open");
        toggleBtn.setAttribute("aria-expanded", "false");
        mobileNav.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    if (toggleBtn && mobileNav) {
        toggleBtn.addEventListener("click", () => {
            const isOpen = toggleBtn.classList.toggle("open");
            mobileNav.classList.toggle("open", isOpen);
            toggleBtn.setAttribute("aria-expanded", String(isOpen));
            mobileNav.setAttribute("aria-hidden", String(!isOpen));
            document.body.style.overflow = isOpen ? "hidden" : "";
        });

        mobileLinks.forEach((link) => link.addEventListener("click", closeMenu));

        // Close on Escape key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") closeMenu();
        });
    }

    /* -----------------------------------------------------------------------
       6. CUSTOM CURSOR (desktop only)
    ----------------------------------------------------------------------- */
    const cursorDot     = document.querySelector(".cursor-dot");
    const cursorOutline = document.querySelector(".cursor-outline");

    if (enablePointerFX && cursorDot && cursorOutline) {
        let outX = pointer.x, outY = pointer.y;

        frameTasks.push(() => {
            cursorDot.style.transform =
                `translate(${pointer.x}px, ${pointer.y}px) translate(-50%, -50%)`;

            outX += (pointer.x - outX) * 0.16;
            outY += (pointer.y - outY) * 0.16;
            cursorOutline.style.transform =
                `translate(${outX}px, ${outY}px) translate(-50%, -50%)`;
        });

        document.querySelectorAll("a, button, .tilt-element, .holo-card").forEach((el) => {
            el.addEventListener("mouseenter", () => cursorOutline.classList.add("hover-active"));
            el.addEventListener("mouseleave", () => cursorOutline.classList.remove("hover-active"));
        });

        window.addEventListener("mousedown", () => cursorOutline.classList.add("cursor-click"));
        window.addEventListener("mouseup",   () => cursorOutline.classList.remove("cursor-click"));
    } else {
        cursorDot     && (cursorDot.style.display = "none");
        cursorOutline && (cursorOutline.style.display = "none");
    }

    /* -----------------------------------------------------------------------
       7. 3D TILT CARDS
    ----------------------------------------------------------------------- */
    function initTilt(cards, rotateMax = 10) {
        cards.forEach((card) => {
            let hovering = false;

            card.addEventListener("mouseenter", () => {
                hovering = true;
                card.style.transition = "box-shadow 0.4s ease, border-color 0.4s ease";
            });

            card.addEventListener("mouseleave", () => {
                hovering = false;
                card.style.transition =
                    "transform 0.6s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease, border-color 0.4s ease";
                card.style.transform =
                    "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)";
            });

            frameTasks.push(() => {
                if (!hovering) return;
                const rect   = card.getBoundingClientRect();
                const rx     = ((pointer.y - rect.top  - rect.height / 2) / (rect.height / 2)) * -rotateMax;
                const ry     = ((pointer.x - rect.left - rect.width  / 2) / (rect.width  / 2)) *  rotateMax;
                card.style.transform =
                    `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02,1.02,1.02)`;
            });
        });
    }

    if (enablePointerFX) {
        initTilt(document.querySelectorAll(".tilt-element"), 8);
    }

    /* -----------------------------------------------------------------------
       8. MAGNETIC CTA BUTTON
    ----------------------------------------------------------------------- */
    const ctaBtn = document.getElementById("cta-explore");

    if (enablePointerFX && ctaBtn) {
        let pulling = false;

        ctaBtn.addEventListener("mouseenter", () => {
            pulling = true;
            ctaBtn.classList.add("magnet-active");
        });

        ctaBtn.addEventListener("mouseleave", () => {
            pulling = false;
            ctaBtn.classList.remove("magnet-active");
            ctaBtn.style.transform = "";
        });

        frameTasks.push(() => {
            if (!pulling) return;
            const rect = ctaBtn.getBoundingClientRect();
            const relX = pointer.x - (rect.left + rect.width  / 2);
            const relY = pointer.y - (rect.top  + rect.height / 2);
            ctaBtn.style.transform = `translate(${relX * 0.22}px, ${relY * 0.22}px)`;
        });
    }

    /* -----------------------------------------------------------------------
       9. HERO PARALLAX
       Hero text moves at a slower rate than scroll, creating depth.
    ----------------------------------------------------------------------- */
    if (!prefersReduced) {
        const heroContent = document.querySelector(".hero-content");
        const heroBgText  = document.querySelector(".hero-bg-text");

        scrollTasks.push((scrollY) => {
            if (heroContent) heroContent.style.transform = `translateY(${scrollY * 0.18}px)`;
            if (heroBgText)  heroBgText.style.transform  = `translateY(calc(-50% + ${scrollY * 0.08}px))`;
        });
    }

    /* -----------------------------------------------------------------------
       10. SCROLL REVEAL (single reusable observer factory)
    ----------------------------------------------------------------------- */
    function setupReveal(selector, {
        addHiddenClass = null,
        visibleClass   = "is-visible",
        threshold      = 0.12,
        rootMargin     = "0px 0px -60px 0px",
        stagger        = false,
    } = {}) {
        const els = document.querySelectorAll(selector);
        if (!els.length) return;

        if (addHiddenClass) els.forEach((el) => el.classList.add(addHiddenClass));

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry, i) => {
                if (!entry.isIntersecting) return;
                const delay = stagger ? i * 90 : 0;
                setTimeout(() => entry.target.classList.add(visibleClass), delay);
                obs.unobserve(entry.target);
            });
        }, { threshold, rootMargin });

        els.forEach((el) => observer.observe(el));
    }

    setupReveal(".reveal-text, .reveal-fade", { addHiddenClass: "hidden-reveal" });
    setupReveal(".reveal-card",  { addHiddenClass: "hidden-reveal", stagger: true });
    setupReveal(".reveal-up",    { threshold: 0.08 });
    setupReveal(".reveal",       { visibleClass: "visible" });

    /* -----------------------------------------------------------------------
       11. BACK-TO-TOP SMOOTH SCROLL (accessibility)
    ----------------------------------------------------------------------- */
    document.querySelectorAll('a[href="#hero"]').forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    });

});
