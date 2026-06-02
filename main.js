// Interactive functionality for Lalira Web Landing Page

document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Toggle
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('open');
      menuToggle.classList.toggle('open');
      
      // Accessibility attributes
      menuToggle.setAttribute('aria-expanded', isOpen);
    });

    // Close menu when a link is clicked
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        menuToggle.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', false);
      });
    });
  }

  // 2. Header Scroll Effect
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }

  // 3. Dynamic Navigation Active Link Highlight on Scroll
  const sections = document.querySelectorAll('section[id]');
  
  function highlightNavigation() {
    const scrollY = window.scrollY;
    
    sections.forEach(current => {
      const sectionHeight = current.offsetHeight;
      const sectionTop = current.offsetTop - 120; // offset for fixed header
      const sectionId = current.getAttribute('id');
      const navLink = document.querySelector(`.nav-menu a[href*="${sectionId}"]`);
      
      if (navLink) {
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
          navLinks.forEach(l => l.classList.remove('active'));
          navLink.classList.add('active');
        } else {
          navLink.classList.remove('active');
        }
      }
    });
  }

  window.addEventListener('scroll', highlightNavigation);
  
  // 4. Subtle Slide-In Scroll Animation using IntersectionObserver
  const animatedElements = document.querySelectorAll('.glass-panel, .section-header, .hero-content, .hero-mockup-wrapper');
  
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  animatedElements.forEach(el => {
    // Initial animation styling if JS is active
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
    observer.observe(el);
  });

  // 5. Hero Phone Showcase Carousel Logic
  const track = document.querySelector('.carousel-track');
  const slides = Array.from(document.querySelectorAll('.carousel-slide'));
  const nextBtn = document.querySelector('.next-btn');
  const prevBtn = document.querySelector('.prev-btn');
  const indicators = Array.from(document.querySelectorAll('.indicator'));
  
  if (track && slides.length > 0) {
    let currentIdx = 0;
    let autoPlayTimer = null;
    
    function moveToSlide(index) {
      // Loop index
      if (index < 0) {
        index = slides.length - 1;
      } else if (index >= slides.length) {
        index = 0;
      }
      
      currentIdx = index;
      
      // Slide the track
      track.style.transform = `translateX(-${(100 / slides.length) * currentIdx}%)`;
      
      // Update active slide class
      slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === currentIdx);
      });
      
      // Update active indicator dot
      indicators.forEach((ind, i) => {
        ind.classList.toggle('active', i === currentIdx);
      });

      // Handle video play/pause & autoplay suspension
      const activeSlide = slides[currentIdx];
      const video = activeSlide.querySelector('video');

      // Pause and reset all videos in other slides
      slides.forEach((slide, i) => {
        if (i !== currentIdx) {
          const vid = slide.querySelector('video');
          if (vid) {
            vid.pause();
            vid.currentTime = 0;
          }
        }
      });

      if (video) {
        // Stop normal autoplay timer
        stopAutoPlay();
        
        // Play active video from start
        video.currentTime = 0;
        video.play().catch(err => console.log("Video auto-play interrupted:", err));
        
        // Advance to next slide once video finishes playing
        video.onended = () => {
          nextSlide();
        };
      } else {
        // If not a video, resume/restart standard auto-play interval
        startAutoPlay();
      }
    }
    
    function nextSlide() {
      moveToSlide(currentIdx + 1);
    }
    
    function prevSlide() {
      moveToSlide(currentIdx - 1);
    }
    
    // Event listeners for controls
    if (nextBtn) nextBtn.addEventListener('click', () => {
      nextSlide();
    });
    
    if (prevBtn) prevBtn.addEventListener('click', () => {
      prevSlide();
    });
    
    // Event listeners for dots
    indicators.forEach((ind, i) => {
      ind.addEventListener('click', () => {
        moveToSlide(i);
      });
    });
    
    // Auto play setup
    function startAutoPlay() {
      // Don't set normal interval if currently showing a video
      const currentSlide = slides[currentIdx];
      if (currentSlide && currentSlide.querySelector('video')) {
        return;
      }
      if (!autoPlayTimer) {
        autoPlayTimer = setInterval(nextSlide, 5000);
      }
    }
    
    function stopAutoPlay() {
      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      }
    }
    
    function resetAutoPlay() {
      stopAutoPlay();
      startAutoPlay();
    }
    
    // Start auto playing
    startAutoPlay();
    
    // Pause auto play when mouse is hovering the phone mockup
    const container = document.querySelector('.phone-container');
    if (container) {
      container.addEventListener('mouseenter', () => {
        // Only pause if it's not a video slide
        const currentSlide = slides[currentIdx];
        if (currentSlide && !currentSlide.querySelector('video')) {
          stopAutoPlay();
        }
      });
      container.addEventListener('mouseleave', () => {
        // Only resume if it's not a video slide
        const currentSlide = slides[currentIdx];
        if (currentSlide && !currentSlide.querySelector('video')) {
          startAutoPlay();
        }
      });
    }
  }
});
