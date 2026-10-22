
/* =====================================================
   BAYFIELD FOOD INGREDIENTS — MAIN JAVASCRIPT
   Navigation, carousels, timeline, forms and intro
===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* ================================================
       1. MOBILE NAVIGATION
    ================================================ */

    const menuToggle = document.querySelector(".menu-toggle");
    const navigation = document.querySelector(".main-navigation");

    if (menuToggle && navigation) {
        menuToggle.addEventListener("click", () => {
            const isOpen = navigation.classList.toggle("is-open");

            menuToggle.setAttribute("aria-expanded", String(isOpen));
            menuToggle.setAttribute(
                "aria-label",
                isOpen ? "Close navigation" : "Open navigation"
            );
        });

        navigation.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                navigation.classList.remove("is-open");
                menuToggle.setAttribute("aria-expanded", "false");
                menuToggle.setAttribute("aria-label", "Open navigation");
            });
        });
    }


    /* ================================================
       2. GENERIC CAROUSELS
    ================================================ */

    document.querySelectorAll("[data-carousel]").forEach((carousel) => {
        const track = carousel.querySelector(".overlap-track");

        if (!track) return;

        carousel.querySelector(".next")?.addEventListener("click", () => {
            if (track.children.length > 1) {
                track.append(track.firstElementChild);
            }
        });

        carousel.querySelector(".prev")?.addEventListener("click", () => {
            if (track.children.length > 1) {
                track.prepend(track.lastElementChild);
            }
        });
    });


    /* ================================================
       3. INGREDIENTS CAROUSEL
    ================================================ */

    const ingredientTrack = document.querySelector(".ingredients-track");

    if (ingredientTrack) {
        const cards = [
            ...ingredientTrack.querySelectorAll(".ingredient-card")
        ];

        const dots = [
            ...document.querySelectorAll(".ingredients-pagination span")
        ];

        const carousel = document.querySelector(".ingredients-carousel");
        const previous = document.querySelector(".ingredients-prev");
        const next = document.querySelector(".ingredients-next");

        let activeIndex = Math.max(
            0,
            cards.findIndex((card) =>
                card.classList.contains("ingredient-card-featured")
            )
        );

        let rotationTimer = null;
        let hovering = false;
        let touchStartX = 0;

        function renderIngredients() {
            const total = cards.length;

            if (!total) return;

            const mobile = window.matchMedia("(max-width: 600px)").matches;
            const tablet = window.matchMedia("(max-width: 900px)").matches;
            const spread = mobile ? 31 : tablet ? 24 : 17;

            cards.forEach((card, index) => {
                let offset = (index - activeIndex + total) % total;

                if (offset > total / 2) {
                    offset -= total;
                }

                const distance = Math.abs(offset);
                const featured = offset === 0;

                card.style.left = `calc(50% + ${offset * spread}%)`;

                card.style.width = mobile
                    ? (featured ? "72%" : "57%")
                    : tablet
                        ? (featured ? "39%" : "27%")
                        : (featured ? "29%" : "18%");

                card.style.height = featured
                    ? (mobile ? "88%" : "100%")
                    : (mobile ? "72%" : "82%");

                card.style.zIndex = String(20 - distance);
                card.style.opacity = distance > 2 ? "0" : "1";
                card.style.pointerEvents = distance > 1 ? "none" : "auto";

                card.style.transform = featured
                    ? "translate(-50%, -50%) scale(1)"
                    : `translate(-50%, -50%) scale(${
                        distance === 1 ? 0.94 : 0.88
                    })`;

                card.classList.toggle(
                    "ingredient-card-featured",
                    featured
                );

                card.setAttribute("aria-current", String(featured));
            });

            dots.forEach((dot, index) => {
                dot.classList.toggle(
                    "active",
                    index === activeIndex % Math.max(dots.length, 1)
                );
            });
        }

        function goTo(index) {
            if (!cards.length) return;

            activeIndex = (index + cards.length) % cards.length;
            renderIngredients();
        }

        function stopRotation() {
            if (rotationTimer !== null) {
                window.clearInterval(rotationTimer);
            }

            rotationTimer = null;
        }

        function startRotation() {
            stopRotation();

            if (
                hovering ||
                window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ) {
                return;
            }

            rotationTimer = window.setInterval(() => {
                goTo(activeIndex + 1);
            }, 3500);
        }

        cards.forEach((card, index) => {
            card.addEventListener("mouseenter", () => {
                hovering = true;
                stopRotation();
                goTo(index);
            });

            card.addEventListener("click", (event) => {
                if (!card.classList.contains("ingredient-card-featured")) {
                    event.preventDefault();
                    goTo(index);
                    stopRotation();
                }
            });
        });

        carousel?.addEventListener("mouseenter", () => {
            hovering = true;
            stopRotation();
        });

        carousel?.addEventListener("mouseleave", () => {
            hovering = false;
            startRotation();
        });

        previous?.addEventListener("click", () => {
            goTo(activeIndex - 1);
            startRotation();
        });

        next?.addEventListener("click", () => {
            goTo(activeIndex + 1);
            startRotation();
        });

        ingredientTrack.addEventListener("touchstart", (event) => {
            touchStartX = event.changedTouches[0].clientX;
        }, { passive: true });

        ingredientTrack.addEventListener("touchend", (event) => {
            const difference =
                event.changedTouches[0].clientX - touchStartX;

            if (Math.abs(difference) < 40) return;

            goTo(activeIndex + (difference < 0 ? 1 : -1));
            startRotation();
        }, { passive: true });

        dots.forEach((dot, index) => {
            dot.style.cursor = "pointer";

            dot.addEventListener("click", () => {
                goTo(index);
                startRotation();
            });
        });

        window.addEventListener("resize", renderIngredients);

        renderIngredients();
        startRotation();
    }


    /* ================================================
       4. JOURNEY TIMELINE AND ARROWS

       - Draws a smooth SVG curve through the actual
         centre of every milestone dot.
       - Recalculates after layout, resize and scrolling.
       - Supports the previous/next navigation buttons.
    ================================================ */

    const journeyViewport = document.querySelector(".journey-viewport");
    const journeyTrack = journeyViewport?.querySelector(".journey-track");
    const journeySvg = journeyTrack?.querySelector(".journey-timeline");
    const journeyPath = journeySvg?.querySelector("path");

    if (journeyViewport && journeyTrack && journeySvg && journeyPath) {
        let timelineFrame = null;
        let timelineObserver = null;

        function layoutJourneyTimeline() {
            if (timelineFrame !== null) {
                cancelAnimationFrame(timelineFrame);
            }

            timelineFrame = requestAnimationFrame(() => {
                timelineFrame = null;

                const nodes = [
                    ...journeyTrack.querySelectorAll(".journey-node")
                ];

                const svgRect = journeySvg.getBoundingClientRect();

                if (
                    nodes.length < 2 ||
                    svgRect.width === 0 ||
                    svgRect.height === 0
                ) {
                    journeyPath.setAttribute("d", "");
                    return;
                }

                /*
                 * Set SVG coordinates to match its actual rendered size.
                 * This keeps the path calculation in the same coordinate
                 * system as the visible dots.
                 */
                journeySvg.setAttribute(
                    "viewBox",
                    `0 0 ${svgRect.width} ${svgRect.height}`
                );

                journeySvg.setAttribute("preserveAspectRatio", "none");

                /*
                 * Measure the real centre of every dot.
                 * Do not estimate positions from grid columns or margins.
                 */
                const points = nodes.map((node) => {
                    const rect = node.getBoundingClientRect();

                    return {
                        x: rect.left + rect.width / 2 - svgRect.left,
                        y: rect.top + rect.height / 2 - svgRect.top
                    };
                });

                /*
                 * Build one continuous cubic Bézier curve through all
                 * measured dot centres.
                 */
                let pathData = `M ${points[0].x} ${points[0].y}`;

                for (let index = 0; index < points.length - 1; index++) {
                    const start = points[index];
                    const end = points[index + 1];

                    const controlX = (end.x - start.x) * 0.42;

                    pathData +=
                        ` C ${start.x + controlX} ${start.y},` +
                        ` ${end.x - controlX} ${end.y},` +
                        ` ${end.x} ${end.y}`;
                }

                journeyPath.setAttribute("d", pathData);
            });
        }

        function moveJourney(direction) {
            const firstItem = journeyTrack.querySelector(".journey-item");

            if (!firstItem) return;

            const trackStyle = getComputedStyle(journeyTrack);

            const gap =
                parseFloat(trackStyle.columnGap) ||
                parseFloat(trackStyle.gap) ||
                0;

            const itemWidth = firstItem.getBoundingClientRect().width;

            journeyViewport.scrollBy({
                left: direction * (itemWidth + gap),
                behavior: "smooth"
            });
        }

        document.querySelector(".journey-prev")?.addEventListener(
            "click",
            () => moveJourney(-1)
        );

        document.querySelector(".journey-next")?.addEventListener(
            "click",
            () => moveJourney(1)
        );

        /*
         * Recalculate when the viewport changes size or scrolls.
         */
        window.addEventListener("resize", layoutJourneyTimeline, {
            passive: true
        });

        journeyViewport.addEventListener("scroll", layoutJourneyTimeline, {
            passive: true
        });

        window.addEventListener("load", layoutJourneyTimeline, {
            once: true
        });

        /*
         * Watch layout changes, including image loading and responsive
         * card dimensions.
         */
        if ("ResizeObserver" in window) {
            timelineObserver = new ResizeObserver(() => {
                layoutJourneyTimeline();
            });

            timelineObserver.observe(journeyTrack);
            timelineObserver.observe(journeyViewport);

            journeyTrack.querySelectorAll(".journey-item").forEach((item) => {
                timelineObserver.observe(item);
            });
        }

        /*
         * Recalculate after images load, since their dimensions can affect
         * the layout.
         */
        journeyTrack.querySelectorAll("img").forEach((image) => {
            if (!image.complete) {
                image.addEventListener("load", layoutJourneyTimeline, {
                    once: true
                });

                image.addEventListener("error", layoutJourneyTimeline, {
                    once: true
                });
            }
        });

        // Initial draw.
        layoutJourneyTimeline();
    }


    /* ================================================
       5. FAQ ACCORDION
    ================================================ */

    const faqItems = [...document.querySelectorAll(".faq-item")];

    faqItems.forEach((item) => {
        const question = item.querySelector(".faq-question");

        if (!question) return;

        question.addEventListener("click", () => {
            const wasOpen = item.classList.contains("active");

            faqItems.forEach((other) => {
                other.classList.remove("active");

                other.querySelector(".faq-question")
                    ?.setAttribute("aria-expanded", "false");
            });

            if (!wasOpen) {
                item.classList.add("active");
                question.setAttribute("aria-expanded", "true");
            }
        });
    });


    /* ================================================
       6. REVEAL ANIMATIONS
    ================================================ */

    const reveals = document.querySelectorAll(".reveal-from-right");

    if (
        "IntersectionObserver" in window &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.18 });

        reveals.forEach((item) => revealObserver.observe(item));
    } else {
        reveals.forEach((item) => item.classList.add("is-visible"));
    }


    /* ================================================
       7. CONTACT FORM PREVIEW
    ================================================ */

    const contactForm = document.querySelector(
        ".bayfield-contact-form, .contact-form"
    );

    if (contactForm) {
        contactForm.addEventListener("submit", (event) => {
            event.preventDefault();

            let status = contactForm.querySelector(".form-status");

            if (!status) {
                status = document.createElement("p");
                status.className = "form-status";
                status.setAttribute("role", "status");
                contactForm.append(status);
            }

            status.textContent =
                "Thanks! This form preview is ready for backend integration.";
        });
    }


    /* ================================================
       8. NEWSLETTER FORM PREVIEW
    ================================================ */

    const newsletterForm = document.querySelector(
        "#newsletter-form, .newsletter"
    );

    if (newsletterForm) {
        newsletterForm.addEventListener("submit", (event) => {
            event.preventDefault();

            let status = newsletterForm.querySelector(".newsletter-status");

            if (!status) {
                status = document.createElement("p");
                status.className = "newsletter-status";
                status.setAttribute("role", "status");
                newsletterForm.append(status);
            }

            status.textContent =
                "Thanks! Connect this form to your mailing-list service before launch.";
        });
    }


    /* ================================================
       9. COPYRIGHT YEAR
    ================================================ */

    const year = document.querySelector("#year");

    if (year) {
        year.textContent = new Date().getFullYear();
    }

});


/* ================================================
   10. CINEMATIC VIDEO INTRO — SINGLE CONTROLLER
================================================ */

(() => {
    function startIntro() {
        const intro = document.getElementById("videoIntro");
        const video = document.getElementById("introVideo");

        if (!intro || !video) return;

        let finished = false;

        function finishIntro() {
            if (finished) return;

            finished = true;

            document.body.classList.remove("intro-playing");
            document.body.classList.add("intro-finished");

            video.pause();
        }

        video.muted = true;
        video.playsInline = true;

        document.body.classList.add("intro-playing");

        window.setTimeout(finishIntro, 800);

        video.play().catch((error) => {
            console.warn("Intro video playback failed:", error);
            finishIntro();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", startIntro, {
            once: true
        });
    } else {
        startIntro();
    }
})();
