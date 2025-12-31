// --- Extracted from RealOSv2.0.0.html ---


        const Storage = {
            db: null,
            init: async () => {
                return new Promise((resolve) => {
                    const request = indexedDB.open("RealOS_MusicDB", 1);
                    request.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains('songs')) db.createObjectStore('songs', { keyPath: 'id', autoIncrement: true });
                    };
                    request.onsuccess = (e) => { Storage.db = e.target.result; resolve(); };
                });
            },
            saveSong: (song) => {
                if (!Storage.db) return;
                const tx = Storage.db.transaction(['songs'], 'readwrite');
                tx.objectStore('songs').add(song);
            },
            removeSong: (id) => {
                if (!Storage.db) return;
                const tx = Storage.db.transaction(['songs'], 'readwrite');
                tx.objectStore('songs').delete(id);
            },
            loadSongs: () => {
                return new Promise((resolve) => {
                    if (!Storage.db) resolve([]);
                    const tx = Storage.db.transaction(['songs'], 'readonly');
                    const req = tx.objectStore('songs').getAll();
                    req.onsuccess = () => resolve(req.result);
                });
            },
            saveSongs: (songs) => {
                // Save all songs (used for updating lrcData)
                if (!Storage.db) return Promise.resolve();
                return new Promise((resolve) => {
                    const tx = Storage.db.transaction(['songs'], 'readwrite');
                    const store = tx.objectStore('songs');
                    // Clear and re-add all songs
                    store.clear();
                    songs.forEach(song => {
                        store.add(song);
                    });
                    tx.oncomplete = () => resolve();
                });
            },
            updateSong: (song) => {
                if (!Storage.db) return;
                const tx = Storage.db.transaction(['songs'], 'readwrite');
                tx.objectStore('songs').put(song);
            },
            saveSettings: () => {
                const data = {
                    darkMode: State.darkMode,
                    islandMode: State.islandMode,
                    islandColor: State.islandColor,
                    tapIndicators: State.tapIndicators,
                    brightness: State.brightness,
                    currentWall: State.currentWall,
                    wallpapers: State.wallpapers,
                    security: State.security,
                    aod: State.aod,
                    lsBlur: State.lsBlur,
                    glassUI: State.glassUI,
                    punchHole: State.punchHole,
                    musicGradient: State.musicGradient,
                    notes: State.notes,
                    animationSpeed: State.animationSpeed,
                    userProfile: State.userProfile,
                    circleOpener: State.circleOpener
                };
                localStorage.setItem('realos_settings', JSON.stringify(data));
            },
            loadSettings: () => {
                const data = localStorage.getItem('realos_settings');
                if (data) {
                    const parsed = JSON.parse(data);
                    Object.assign(State, parsed);
                }
            }
        };

        
        const APPS = [
            { id: 'settings', name: 'Settings', color: '#8e8e93', icon: 'fa-cog', area: 'grid' },
            { id: 'music', name: 'Music', color: '#fa2d48', icon: 'fa-music', area: 'grid' },
            { id: 'photos', name: 'Photos', color: '#fff', text: '#000', icon: 'fa-images', area: 'grid' },
            { id: 'clock', name: 'Clock', color: '#000', icon: 'fa-clock', area: 'grid', border: false },
            { id: 'notes', name: 'Notes', color: '#f1c40f', icon: 'fa-sticky-note', area: 'grid' },
            { id: 'calc', name: 'Calculator', color: '#000', icon: 'fa-calculator', area: 'grid', border: false },
            { id: 'files', name: 'Files', color: '#007aff', icon: 'fa-folder', area: 'grid' },
            { id: 'camera', name: 'Camera', color: '#333', icon: 'fa-camera', area: 'grid' },
            { id: 'phone', name: 'Phone', color: '#34c759', icon: 'fa-phone', area: 'dock' },
            { id: 'safari', name: 'Safari', color: '#007aff', icon: 'fa-compass', area: 'dock' },
            { id: 'messages', name: 'Messages', color: '#34c759', icon: 'fa-comment', area: 'dock' },
            { id: 'mail', name: 'Mail', color: '#007aff', icon: 'fa-envelope', area: 'dock' },
            { id: 'features', name: 'Features', color: '#000', icon: 'fa-star', area: 'hidden', hidden: true }
        ];

        
        const State = {
            activeApp: null,
            isAnimating: false,
            darkMode: false,
            accentColor: '#007aff',
            islandMode: 'clock',
            islandColor: '#000',
            tapIndicators: false,
            brightness: 100,
            wallpapers: ['https://i.ibb.co/jP4DGMYR/wallpaper.jpg'],
            currentWall: 0,
            poweredOn: true,
            security: {
                pin: null,
                fingerprint: false,
                bioIcon: 'default'
            },
            aod: {
                enabled: false,
                image: null,
                style: 'default',
                text: '',
                wallpaper: false
            },
            notes: [], // User created notes
            lsBlur: false,
            glassUI: false, // Defaulting to true as requested by revert
            punchHole: false,
            musicGradient: false,
            locked: true,
            animationSpeed: 1.5, // Animation speed multiplier (0.5 to 5, default 1.5)
            userProfile: {
                name: 'Guest',
                image: null
            }
        };

        
        function resize() {
            const wrap = document.getElementById('scale-wrapper');
            const targetWidth = 400; // Intrinsic width of the device container
            const targetHeight = 860; // Intrinsic height

            // Available space minus padding
            const availW = window.innerWidth - 20;
            const availH = window.innerHeight - 20;

            // Calculate scale to fit both width and height
            const scale = Math.min(availW / targetWidth, availH / targetHeight);

            // Apply scale
            wrap.style.transform = `scale(${scale})`;

            // Re-center if needed (flexbox on body handles most, but ensures no overflow issues)
            // wrap.style.marginLeft = `${(availW - targetWidth * scale) / 2}px`; 
        }
        window.onresize = resize;
        // Call immediately
        setTimeout(resize, 0);

        const OS = {
            init: async () => {
                resize();
                Storage.loadSettings();
                await Storage.init();
                await Music.loadFromDB();

                Setup.check();

                OS.renderApps();
                OS.updateTime();
                OS.applySettings();
                setInterval(OS.updateTime, 1000);
                OS.setupGestures();
                Island.renderIdle();

                document.body.addEventListener('click', (e) => {
                    if (State.tapIndicators && State.poweredOn) OS.createRipple(e);
                });
                window.addEventListener('mouseup', () => Music.endScrub());
                window.addEventListener('touchend', () => Music.endScrub());
                window.addEventListener('keydown', (e) => {
                    if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') AppManager.close();
                    // Q key to toggle power
                    if (e.code === 'KeyQ' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                        OS.togglePower();
                    }
                });

                // Custom Wallpaper Input Handler
                const wallInput = document.getElementById('wall-input');
                if (wallInput) {
                    wallInput.onchange = (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                            const url = evt.target.result;
                            State.wallpapers.push(url);
                            State.currentWall = State.wallpapers.length - 1;
                            OS.applySettings();
                            if (Apps.settings.view === 'wallpaper') Apps.settings.render('wallpaper');
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                    };
                }

                LockScreen.init();
            },

            togglePower: () => {
                if (document.getElementById('setup-screen').classList.contains('active')) return;

                // Collapse island before power off
                if (State.poweredOn && Island.expanded) {
                    Island.collapse();
                    setTimeout(OS.togglePower, 50);
                    return;
                }

                State.poweredOn = !State.poweredOn;
                const layer = document.getElementById('power-layer');
                const gClock = document.getElementById('global-clock');
                const aodTxt = document.getElementById('aod-user-text');

                if (!State.poweredOn) {
                    if (State.activeApp) AppManager.close();
                    layer.classList.add('off');
                    LockScreen.lock();
                    gClock.classList.remove('in-statusbar');

                    if (State.aod.enabled) {
                        layer.classList.add('aod-active');
                        gClock.classList.add('aod-mode');

                        // Fonts
                        const f = State.aod.style;
                        if (f === 'serif') gClock.style.fontFamily = "'Times New Roman', serif";
                        else if (f === 'science') gClock.style.fontFamily = "'Rajdhani', sans-serif";
                        else if (f === 'mono') gClock.style.fontFamily = "'Monoton', cursive";
                        else if (f === 'lux') gClock.style.fontFamily = "'Luxurious Roman', serif";
                        else gClock.style.fontFamily = "'Inter', sans-serif";

                        aodTxt.innerText = State.aod.text || "";

                        if (State.aod.wallpaper) layer.classList.add('aod-wall-on');
                        else layer.classList.remove('aod-wall-on');

                        if (Music.active) document.getElementById('aod-music').style.display = 'flex';
                        else document.getElementById('aod-music').style.display = 'none';
                    } else {
                        layer.classList.remove('aod-active');
                        gClock.classList.add('hidden');
                    }
                } else {
                    layer.classList.remove('off');
                    gClock.classList.remove('aod-mode');
                    gClock.classList.remove('hidden');
                    gClock.style.fontFamily = 'inherit';
                    OS.applySettings();
                }
            },

            showPopup: (title, msg, onYes, onNo) => {
                document.getElementById('osm-title').innerText = title;
                document.getElementById('osm-msg').innerHTML = msg;

                const footer = document.getElementById('osm-footer');
                footer.innerHTML = '';

                if (onYes) {
                    const yes = document.createElement('div');
                    yes.className = 'osm-btn primary';
                    yes.innerText = 'Yes';
                    yes.onclick = () => { onYes(); OS.hidePopup(); };

                    const no = document.createElement('div');
                    no.className = 'osm-btn secondary';
                    no.innerText = 'No';
                    no.onclick = () => { if (onNo) onNo(); OS.hidePopup(); };

                    footer.appendChild(no);
                    footer.appendChild(yes);
                } else {
                    const ok = document.createElement('div');
                    ok.className = 'osm-btn primary';
                    ok.innerText = 'OK';
                    ok.onclick = OS.hidePopup;
                    footer.appendChild(ok);
                }

                document.getElementById('modal-overlay').classList.add('active');
            },

            hidePopup: () => {
                document.getElementById('modal-overlay').classList.remove('active');
            },

            createRipple: (e) => {
                const ripple = document.createElement('div');
                ripple.className = 'touch-ripple';
                ripple.style.left = e.clientX - 10 + 'px';
                ripple.style.top = e.clientY - 10 + 'px';
                document.body.appendChild(ripple);
                setTimeout(() => ripple.remove(), 400);
            },

            renderApps: () => {
                const grid = document.getElementById('app-grid');
                const dock = document.getElementById('dock');
                grid.innerHTML = ''; dock.innerHTML = '';

                APPS.forEach(app => {
                    if (app.hidden) return;
                    const el = document.createElement('div');
                    el.className = 'app-icon';
                    el.id = `icon-${app.id}`;
                    el.onclick = () => AppManager.open(app.id);
                    el.innerHTML = `
                <div class="icon-box" style="background:${app.color}; color:${app.text || 'white'}; ${app.border ? 'border:1px solid #333' : ''}">
                    <i class="fas ${app.icon}"></i>
                </div>
                <div class="icon-label">${app.name}</div>
            `;
                    (app.area === 'dock' ? dock : grid).appendChild(el);
                });
            },

            updateTime: () => {
                const d = new Date();
                const hours = d.getHours();
                let hours12 = hours % 12;
                if (hours12 === 0) hours12 = 12;
                const minutes = d.getMinutes();
                const minutesPadded = minutes < 10 ? '0' + minutes : minutes;
                const time = hours12 + ':' + minutesPadded;

                document.getElementById('clock').innerText = time;
                document.getElementById('global-time').innerText = time;

                const opts = { weekday: 'long', month: 'short', day: 'numeric' };
                const dateStr = d.toLocaleDateString('en-US', opts);
                document.getElementById('ls-date').innerText = dateStr;
                document.getElementById('aod-date').innerText = dateStr;

                if (State.islandMode === 'clock') {
                    const iText = document.getElementById('di-idle-text');
                    if (iText) iText.innerText = time;
                }
            },

            setupGestures: () => {
                const bar = document.getElementById('gesture-area');
                let startY = 0;

                // Mouse Events
                bar.addEventListener('mousedown', e => { startY = e.clientY; });
                window.addEventListener('mouseup', e => {
                    // Logic triggers regardless of animation state
                    if (startY && e.clientY - startY < -50) AppManager.close();
                    startY = 0;
                });

                // Touch Events
                bar.addEventListener('touchstart', e => { startY = e.touches[0].clientY; });
                bar.addEventListener('touchend', e => {
                    if (startY && e.changedTouches[0].clientY - startY < -50) AppManager.close();
                });

                // Click Events
                bar.addEventListener('click', () => {
                    AppManager.close();
                });

                document.getElementById('device').addEventListener('click', (e) => {
                    if (!e.target.closest('#island-wrap') && !e.target.closest('.app-icon')) {
                        Island.collapse();
                    }
                });
            },

            applySettings: () => {
                document.documentElement.style.setProperty('--accent', State.accentColor);
                const island = document.getElementById('dynamic-island');
                island.className = '';
                if (State.punchHole && !Music.active && !Timer.running && !Island.expanded) island.classList.add('punch-hole');

                if (State.islandColor.includes('gradient') || State.islandColor === 'rainbow') {
                    if (State.islandColor === 'rainbow') island.classList.add('island-rainbow');
                    else island.classList.add('island-purple-grad');
                    document.documentElement.style.setProperty('--island-bg', '#000');
                } else {
                    document.documentElement.style.setProperty('--island-bg', State.islandColor);
                }

                // Apply Gesture Bar Color
                const bar = document.querySelector('.home-bar');
                if (State.darkMode) {
                    document.body.classList.add('dark-mode');
                    bar.style.backgroundColor = '#fff';
                } else {
                    document.body.classList.remove('dark-mode');
                    bar.style.backgroundColor = '#000';
                }

                if (State.glassUI) document.body.classList.add('glass-ui');
                else document.body.classList.remove('glass-ui');

                document.documentElement.style.setProperty('--home-anim-dur', `${0.5 * State.animationSpeed}s`);

                document.getElementById('brightness-layer').style.opacity = (100 - State.brightness) / 100;
                Island.renderIdle();

                // AOD
                const aodImg = document.getElementById('aod-img');
                if (State.aod.image) {
                    aodImg.src = State.aod.image;
                    aodImg.style.display = 'block';
                } else {
                    aodImg.style.display = 'none';
                }

                // Font Logic
                const gClock = document.getElementById('global-clock');
                const f = State.aod.style;
                let fam = "'Inter', sans-serif";
                if (f === 'serif') fam = "'Times New Roman', serif";
                else if (f === 'science') fam = "'Rajdhani', sans-serif";
                else if (f === 'mono') fam = "'Monoton', cursive";
                else if (f === 'lux') fam = "'Luxurious Roman', serif";

                // Apply unconditionally so CSS !important handles the override in statusbar mode
                // gClock.style.fontFamily = fam; 
                document.documentElement.style.setProperty('--lock-font', fam);
                document.documentElement.style.setProperty('--home-anim-dur', (0.5 * State.animationSpeed) + 's');

                document.documentElement.style.setProperty('--wall', `url(${State.wallpapers[State.currentWall]})`);

                // Lockscreen Blur Update (10px)
                if (State.locked && State.lsBlur) document.body.classList.add('ls-blurred');
                else document.body.classList.remove('ls-blurred');

                LockScreen.updateUI();
                Storage.saveSettings();
            }
        };

        
        const Setup = {
            check: () => {
                const status = localStorage.getItem('realos_setup_status');
                if (!status) {
                    document.getElementById('setup-screen').classList.add('active');
                    document.querySelector('.setup-header').classList.add('visible');
                } else if (status === 'notice_only') {
                    document.getElementById('setup-screen').classList.add('active');
                    document.getElementById('slide-welcome').classList.remove('current');
                    document.getElementById('slide-welcome').style.display = 'none';
                    document.getElementById('slide-notice').classList.add('current');
                }
            },
            next: (curr, nextId) => {
                document.getElementById(`slide-${curr}`).classList.add('prev');
                document.getElementById(`slide-${curr}`).classList.remove('current');
                document.getElementById(`slide-${nextId}`).classList.add('current');

                // Hide header if not welcome or finish
                if (nextId !== 'welcome' && nextId !== 'finish') {
                    document.querySelector('.setup-header').classList.remove('visible');
                } else {
                    document.querySelector('.setup-header').classList.add('visible');
                }
            },
            handleNoticeNext: () => {
                const status = localStorage.getItem('realos_setup_status');
                if (status === 'notice_only' || status === 'done') {
                    const el = document.getElementById('setup-screen');
                    el.classList.add('fade-out');
                    setTimeout(() => {
                        el.classList.remove('active', 'fade-out');
                    }, 500);
                } else {
                    Setup.next('notice', 'theme');
                }
            },
            toggleThemeSetup: () => {
                Apps.settings.toggleDark();
                const lightP = document.getElementById('tp-light');
                const darkP = document.getElementById('tp-dark');
                if (State.darkMode) {
                    lightP.classList.remove('active');
                    darkP.classList.add('active');
                } else {
                    darkP.classList.remove('active');
                    lightP.classList.add('active');
                }
            },
            toggleGlassSetup: () => {
                Apps.settings.toggleGlass();
                const glassT = document.getElementById('setup-glass-toggle');
                if (State.glassUI) glassT.classList.add('active');
                else glassT.classList.remove('active');
            },
            launchPinSetup: () => {
                document.getElementById('app-window').style.display = 'flex';
                document.getElementById('app-window').style.zIndex = '20001';
                Apps.settings.render('pin');
                // Override back button for setup context
                const backBtn = document.getElementById('app-back');
                backBtn.style.display = 'block';
                backBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Setup';
                backBtn.onclick = () => {
                    document.getElementById('app-window').style.display = 'none';
                    document.getElementById('app-window').style.zIndex = '';
                };
            },
            selectProfileImage: () => {
                const input = document.getElementById('profile-input');
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) Setup.handleProfileImage(file);
                };
                input.click();
            },
            handleProfileImage: (file) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const preview = document.getElementById('setup-profile-preview');
                    const icon = document.getElementById('setup-profile-user-icon');
                    preview.src = e.target.result;
                    preview.style.display = 'block';
                    icon.style.display = 'none';
                    State.userProfile.image = e.target.result;
                };
                reader.readAsDataURL(file);
            },
            saveProfile: () => {
                const nameInput = document.getElementById('setup-name-input');
                const name = nameInput.value.trim();
                State.userProfile.name = name || 'Guest';
                Storage.saveSettings();
                Setup.next('profile', 'security');
            },
            finish: () => {
                localStorage.setItem('realos_last_version', '2.0.0');

                const el = document.getElementById('setup-screen');
                el.classList.add('fade-out');

                setTimeout(() => {
                    el.classList.remove('active', 'fade-out');

                    // Welcome Flow Trigger
                    // Only triggering for actual first setup completion or update notice
                    if (localStorage.getItem('realos_setup_status') !== 'notice_only' || true) {
                        const checkUnlock = setInterval(() => {
                            const lock = document.getElementById('lock-screen');
                            // Strict check: Must not be locked, and lockscreen must be hidden (or opacity 0)
                            if (!State.locked && (lock.classList.contains('hidden') || getComputedStyle(lock).opacity === '0')) {
                                clearInterval(checkUnlock);
                                setTimeout(() => {
                                    Island.expand('welcome');
                                    // Auto dismiss after 5s
                                    setTimeout(() => Island.collapse(), 5000);
                                }, 500);
                            }
                        }, 500);
                    }
                    localStorage.setItem('realos_setup_status', 'notice_only'); // Set for next reload
                }, 500);
            }
        };

        
        const LockScreen = {
            currentPin: '',
            init: () => {
                const ls = document.getElementById('lock-screen');
                let startY = 0;
                ls.addEventListener('touchstart', e => startY = e.touches[0].clientY);
                ls.addEventListener('touchend', e => {
                    if (startY && e.changedTouches[0].clientY - startY < -50) LockScreen.attemptUnlock();
                    startY = 0;
                });
                ls.addEventListener('mousedown', e => startY = e.clientY);
                window.addEventListener('mouseup', e => {
                    if (startY && State.locked && e.clientY - startY < -50 && e.target.closest('#lock-screen')) LockScreen.attemptUnlock();
                    startY = 0;
                });

                const bioBtn = document.getElementById('ls-biometric');
                let holdTimer = null;
                let isHolding = false;

                const startScan = (e) => {
                    e.stopPropagation(); e.preventDefault();
                    if (!State.security.fingerprint) return;
                    isHolding = true;
                    bioBtn.classList.add('scanning');

                    holdTimer = setTimeout(() => {
                        if (isHolding) {
                            LockScreen.unlock();
                            bioBtn.classList.remove('scanning');
                            isHolding = false;
                        }
                    }, State.security.slowFingerprint ? 1250 : 250);
                };
                const endScan = (e) => {
                    e.stopPropagation(); e.preventDefault();
                    clearTimeout(holdTimer);
                    isHolding = false;
                    bioBtn.classList.remove('scanning');
                };
                bioBtn.addEventListener('mousedown', startScan);
                bioBtn.addEventListener('mouseup', endScan);
                bioBtn.addEventListener('mouseleave', endScan); // FIX: Stop scan if mouse leaves element
                bioBtn.addEventListener('touchstart', startScan);
                bioBtn.addEventListener('touchend', endScan);
                LockScreen.updateUI();
            },

            shake: () => {
                const els = [document.getElementById('ls-biometric'), document.getElementById('ls-pin-pad')];
                els.forEach(el => {
                    if (el) {
                        el.classList.add('shake');
                        setTimeout(() => el.classList.remove('shake'), 400);
                    }
                });
            },

            lock: () => {
                State.locked = true;
                document.getElementById('lock-screen').classList.remove('hidden');
                document.getElementById('home-screen').classList.add('hidden-locked');
                document.getElementById('ls-pin-pad').classList.remove('active');
                document.getElementById('global-clock').classList.remove('in-statusbar');
                OS.applySettings();
                LockScreen.currentPin = '';
                LockScreen.updateUI();
            },

            unlock: () => {
                State.locked = false;
                document.getElementById('lock-screen').classList.add('hidden');
                document.getElementById('home-screen').classList.remove('hidden-locked');
                document.getElementById('global-clock').classList.add('in-statusbar');
                document.body.classList.remove('ls-blurred');
                Island.notifyUnlock();
            },

            attemptUnlock: () => {
                if (State.security.pin) {
                    document.getElementById('ls-pin-pad').classList.add('active');
                    LockScreen.renderDots();
                } else {
                    LockScreen.unlock();
                }
            },

            updateUI: () => {
                const bioBtn = document.getElementById('ls-biometric');
                if (State.security.fingerprint) {
                    bioBtn.style.display = 'flex';
                    bioBtn.className = '';
                    bioBtn.innerHTML = '';

                    const icon = State.security.bioIcon;
                    if (icon === 'mk') {
                        bioBtn.classList.add('bio-mk');
                        bioBtn.innerHTML = '<i class="fas fa-dragon"></i><div class="bio-wave"></div>';
                    } else if (icon === 'orb') {
                        bioBtn.innerHTML = '<div class="bio-orb"><div class="orb-dot"></div><div class="orb-dot"></div><div class="orb-dot"></div></div><div class="bio-wave"></div>';
                    } else if (icon === 'abstract') {
                        bioBtn.style.border = '2px solid transparent';
                        bioBtn.innerHTML = '<div class="bio-abs"><div class="abs-layer abs-1"></div><div class="abs-layer abs-2"></div><div class="abs-layer abs-3"></div></div><div class="bio-wave"></div>';
                    } else if (icon === 'bio-grad') {
                        bioBtn.style.border = '2px solid rgba(255,255,255,0.2)';
                        bioBtn.innerHTML = '<div class="bio-grad"><div class="grad-fill"></div></div><i style="position:relative;z-index:2" class="fas fa-fingerprint"></i>';
                    } else if (icon === 'bio-aura') {
                        bioBtn.style.border = 'none';
                        bioBtn.style.background = 'transparent';
                        bioBtn.style.backdropFilter = 'none';
                        bioBtn.innerHTML = '<div class="bio-aura-ring"></div><i class="fas fa-fingerprint" style="position:relative; z-index:2"></i>';
                    } else if (icon === 'bio-swirl') {
                        bioBtn.style.border = 'none';
                        bioBtn.style.background = 'transparent';
                        bioBtn.style.backdropFilter = 'none';
                        bioBtn.innerHTML = '<div class="bio-swirl"><div class="swirl-ring"></div><div class="swirl-ring"></div><div class="swirl-ring"></div><div class="swirl-ring"></div></div>';
                    } else if (icon === 'bio-pulse') {
                        bioBtn.style.border = 'none';
                        bioBtn.style.background = 'rgba(0, 0, 0, 0.3)';
                        bioBtn.style.backdropFilter = 'blur(10px)';
                        bioBtn.innerHTML = '<div class="bio-pulse-ring"></div><i class="fas fa-fingerprint" style="position:relative; z-index:2; color:#00ff88"></i><div class="bio-wave"></div>';
                    } else if (icon === 'bio-hex') {
                        bioBtn.style.border = 'none';
                        bioBtn.style.background = 'rgba(0, 0, 0, 0.4)';
                        bioBtn.style.backdropFilter = 'blur(10px)';
                        bioBtn.innerHTML = '<div class="bio-hex"></div><i class="fas fa-fingerprint" style="position:relative; z-index:2; color:#8a2be2"></i><div class="bio-wave"></div>';
                    } else if (icon === 'bio-ripple') {
                        bioBtn.style.border = 'none';
                        bioBtn.style.background = 'rgba(0, 0, 0, 0.3)';
                        bioBtn.style.backdropFilter = 'blur(10px)';
                        bioBtn.innerHTML = '<div class="bio-ripple"></div><i class="fas fa-fingerprint" style="position:relative; z-index:2; color:#ffa500"></i><div class="bio-wave"></div>';
                    } else if (icon === 'bio-circuit') {
                        bioBtn.style.border = 'none';
                        bioBtn.style.background = 'rgba(0, 0, 0, 0.3)';
                        bioBtn.style.backdropFilter = 'blur(10px)';
                        bioBtn.innerHTML = '<div class="bio-circuit"></div><i class="fas fa-fingerprint" style="position:relative; z-index:2; color:#00ffff"></i><div class="bio-wave"></div>';
                    } else if (icon === 'bio-dna') {
                        bioBtn.style.border = 'none';
                        bioBtn.style.background = 'rgba(0, 0, 0, 0.3)';
                        bioBtn.style.backdropFilter = 'blur(10px)';
                        bioBtn.innerHTML = '<div class="bio-dna"></div><i class="fas fa-fingerprint" style="position:relative; z-index:2; color:#ff0080"></i><div class="bio-wave"></div>';
                    } else if (icon === 'bio-scan') {
                        bioBtn.style.border = 'none';
                        bioBtn.style.background = 'rgba(0, 0, 0, 0.3)';
                        bioBtn.style.backdropFilter = 'blur(10px)';
                        bioBtn.innerHTML = '<div class="bio-scan"></div><i class="fas fa-fingerprint" style="position:relative; z-index:2; color:#32cd32"></i><div class="bio-wave"></div>';
                    } else if (icon === 'bio-matrix') {
                        bioBtn.style.border = 'none';
                        bioBtn.style.background = 'rgba(0, 0, 0, 0.3)';
                        bioBtn.style.backdropFilter = 'blur(10px)';
                        bioBtn.innerHTML = '<div class="bio-matrix"></div><i class="fas fa-fingerprint" style="position:relative; z-index:2; color:#0096ff"></i><div class="bio-wave"></div>';
                    } else {
                        bioBtn.innerHTML = '<i class="fas fa-fingerprint"></i><div class="bio-wave"></div>';
                    }
                }
                else bioBtn.style.display = 'none';
            },

            addPin: (n) => {
                if (LockScreen.currentPin.length < 4) {
                    LockScreen.currentPin += n;
                    LockScreen.renderDots();
                    if (LockScreen.currentPin.length === 4) LockScreen.verifyPin();
                }
            },
            cancelPin: () => {
                document.getElementById('ls-pin-pad').classList.remove('active');
                LockScreen.currentPin = '';
                LockScreen.renderDots();
            },
            renderDots: () => {
                const dots = document.getElementById('ls-dots').children;
                for (let i = 0; i < 4; i++) {
                    if (i < LockScreen.currentPin.length) dots[i].classList.add('filled');
                    else dots[i].classList.remove('filled');
                }
            },
            verifyPin: () => {
                setTimeout(() => {
                    if (LockScreen.currentPin === State.security.pin) {
                        LockScreen.unlock();
                    } else {
                        LockScreen.shake();
                        LockScreen.currentPin = '';
                        LockScreen.renderDots();
                    }
                }, 200);
            }
        };

        
        
        const AppManager = {
            // Store icon origin for close animation
            origin: null,
            closingApp: null,
            closingAppId: null,
            closeTimeout: null,
            iconFadeTimeout: null,
            currentZIndex: 100,

            open: (id) => {
                // Interruptible Animation: If reopening a closing app, reverse the animation
                if (id === AppManager.closingAppId && AppManager.closingApp) {
                    // Cancel pending timeouts
                    clearTimeout(AppManager.closeTimeout);
                    clearTimeout(AppManager.iconFadeTimeout);

                    const closeClone = AppManager.closingApp;
                    const win = document.getElementById('app-window');

                    // Capture clone's current mid-animation state
                    const cloneRect = closeClone.getBoundingClientRect();
                    const sRect = document.getElementById('screen').getBoundingClientRect();
                    const scaleFactor = document.getElementById('scale-wrapper').getBoundingClientRect().width / 400;
                    const cloneComp = window.getComputedStyle(closeClone);

                    const curTop = (cloneRect.top - sRect.top) / scaleFactor;
                    const curLeft = (cloneRect.left - sRect.left) / scaleFactor;
                    const curW = cloneRect.width / scaleFactor;
                    const curH = cloneRect.height / scaleFactor;
                    const curRadius = cloneComp.borderRadius;
                    // const curScale = curW / 400; // No longer needed for geometry anim
                    const curBg = cloneComp.background;

                    // Remove clone
                    closeClone.remove();
                    AppManager.closingApp = null;
                    AppManager.closingAppId = null;
                    document.body.classList.remove('closing-active');

                    // Restore state
                    State.activeApp = id;
                    State.isAnimating = true;

                    // Get app info
                    const appInfo = APPS.find(a => a.id === id);
                    const isDarkApp = ['music', 'clock', 'calc', 'camera'].includes(id) || State.darkMode;

                    // Set window to clone's captured state with app background and disable glass
                    win.classList.add('app-animating');
                    win.style.display = 'flex';
                    win.style.transition = 'none';
                    win.style.transformOrigin = 'top left';

                    // Use geometry instead of scale
                    win.style.transform = 'translate(0,0) scale(1)';
                    win.style.top = `${curTop}px`;
                    win.style.left = `${curLeft}px`;
                    win.style.width = `${curW}px`;
                    win.style.height = `${curH}px`;

                    win.style.borderRadius = curRadius;
                    win.style.opacity = '1';

                    // Set initial background
                    win.style.setProperty('background', appInfo.color || '#000', 'important');

                    // Create icon overlay for smooth transition
                    const iconOverlay = document.createElement('div');
                    iconOverlay.id = 'app-open-icon-overlay';
                    iconOverlay.style.cssText = `
                        position: absolute;
                        inset: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 1000;
                        pointer-events: none;
                        transition: opacity ${0.25 * State.animationSpeed}s ease;
                    `;
                    iconOverlay.innerHTML = `<i class="fas ${appInfo.icon}" style="font-size: 50px; color: ${appInfo.text || 'white'};"></i>`;
                    win.appendChild(iconOverlay);

                    // Hide header and body initially
                    const header = document.getElementById('app-header');
                    const appBody = document.getElementById('app-body');
                    header.style.transition = 'none';
                    header.style.opacity = '0';
                    appBody.style.transition = 'none';
                    appBody.style.opacity = '0';

                    const iconEl = document.getElementById(`icon-${id}`);
                    if (iconEl) iconEl.classList.add('app-current');

                    // Animate to full screen
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            document.body.classList.add('app-open');

                            // Animate geometry to fullscreen
                            win.style.transition = `
                                top ${0.5 * State.animationSpeed}s var(--ease-ios),
                                left ${0.5 * State.animationSpeed}s var(--ease-ios),
                                width ${0.5 * State.animationSpeed}s var(--ease-ios),
                                height ${0.5 * State.animationSpeed}s var(--ease-ios),
                                border-radius ${0.5 * State.animationSpeed}s ease`;

                            win.style.top = '0px';
                            win.style.left = '0px';
                            win.style.width = '100%';
                            win.style.height = '100%';
                            win.style.borderRadius = '35px';

                            // Fade out icon and fade in content early
                            setTimeout(() => {
                                iconOverlay.style.opacity = '0';
                                header.style.transition = `opacity ${0.3 * State.animationSpeed}s ease`;
                                appBody.style.transition = `opacity ${0.3 * State.animationSpeed}s ease`;
                                header.style.opacity = '1';
                                appBody.style.opacity = '1';

                                // Restore proper background immediately when content starts fading in
                                win.classList.remove('app-animating');
                                win.style.transition = `
                                    top ${0.5 * State.animationSpeed}s var(--ease-ios),
                                    left ${0.5 * State.animationSpeed}s var(--ease-ios),
                                    width ${0.5 * State.animationSpeed}s var(--ease-ios),
                                    height ${0.5 * State.animationSpeed}s var(--ease-ios),
                                    border-radius ${0.5 * State.animationSpeed}s ease,
                                    background ${0.2 * State.animationSpeed}s ease`;

                                if (State.glassUI) {
                                    win.style.background = State.darkMode ? 'rgba(30,30,30,0.65)' : 'rgba(243,243,243,0.65)';
                                } else {
                                    win.style.background = isDarkApp ? '#000' : '#f2f2f7';
                                }

                                // Clean up icon overlay after fade
                                setTimeout(() => {
                                    if (iconOverlay.parentNode) iconOverlay.remove();
                                }, 300 * State.animationSpeed);
                            }, 50 * State.animationSpeed);

                            setTimeout(() => { State.isAnimating = false; }, 500 * State.animationSpeed);
                        });
                    });

                    return;
                }

                if (State.activeApp === id && !AppManager.closingApp) return;
                if (State.activeApp && !AppManager.closingApp) return;

                State.activeApp = id;
                State.isAnimating = true; // Lock interactions (except close)

                const win = document.getElementById('app-window');
                AppManager.currentZIndex += 10;
                win.style.zIndex = AppManager.currentZIndex;

                // Features special case
                if (id === 'features') {
                    AppManager.origin = null;
                    win.style.display = 'flex';
                    win.style.transition = 'none';
                    win.style.transform = 'translate(0,0) scale(0.8)';
                    win.style.opacity = '0';
                    win.style.width = '100%';
                    win.style.height = '100%';
                    win.style.background = '#000';
                    win.style.borderRadius = '20px';

                    document.getElementById('app-header').style.color = '#fff';
                    document.getElementById('app-title').innerText = 'Features';
                    document.getElementById('app-back').style.display = 'none';
                    document.getElementById('app-back').onclick = AppManager.close;

                    if (Apps[id]) Apps[id].render();

                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            document.body.classList.remove('closing-active');
                            document.body.classList.add('app-open');
                            win.style.transition = `transform ${0.5 * State.animationSpeed}s var(--ease-ios), opacity ${0.5 * State.animationSpeed}s ease, border-radius ${0.5 * State.animationSpeed}s ease`;
                            win.style.transform = 'translate(0,0) scale(1)';
                            win.style.opacity = '1';
                            win.style.borderRadius = '35px';
                            setTimeout(() => { State.isAnimating = false; }, 500 * State.animationSpeed);
                        });
                    });
                    return;
                }

                const iconEl = document.getElementById(`icon-${id}`);
                const icon = iconEl.querySelector('.icon-box');
                iconEl.classList.add('app-current');
                icon.classList.remove('fade-in-anim');

                const iRect = icon.getBoundingClientRect();
                const sRect = document.getElementById('screen').getBoundingClientRect();
                const scaleFactor = document.getElementById('scale-wrapper').getBoundingClientRect().width / 400;

                const startTop = (iRect.top - sRect.top) / scaleFactor;
                const startLeft = (iRect.left - sRect.left) / scaleFactor;
                const startWidth = iRect.width / scaleFactor;
                const startHeight = iRect.height / scaleFactor;
                AppManager.origin = { top: startTop, left: startLeft, w: startWidth, h: startHeight };

                const screenWidth = 400;
                // Use geometry animation to avoid aspect ratio distortion (sudden rectangle glitch)

                win.style.display = 'flex';
                win.style.transition = 'none';
                win.style.transformOrigin = 'top left';
                win.style.transform = 'translate(0,0) scale(1)';

                // Set initial geometry to match the icon exactly
                win.style.top = `${startTop}px`;
                win.style.left = `${startLeft}px`;
                win.style.width = `${startWidth}px`;
                win.style.height = `${startHeight}px`; // Square, matching icon
                win.style.borderRadius = State.circleOpener ? '50%' : '16px'; // Dynamic shape

                win.style.opacity = '1';

                // Get app info for icon display
                const appInfo = APPS.find(a => a.id === id);

                // Set initial background to app's icon color and disable glass
                win.classList.add('app-animating');
                win.style.setProperty('background', appInfo.color || '#000', 'important');

                const isDarkApp = ['music', 'clock', 'calc', 'camera'].includes(id) || State.darkMode;

                // Create icon overlay for smooth transition
                const iconOverlay = document.createElement('div');
                iconOverlay.id = 'app-open-icon-overlay';
                iconOverlay.style.cssText = `
                    position: absolute;
                    inset: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    pointer-events: none;
                    transition: opacity ${0.25 * State.animationSpeed}s ease;
                `;
                iconOverlay.innerHTML = `<i class="fas ${appInfo.icon}" style="font-size: 50px; color: ${appInfo.text || 'white'};"></i>`;
                win.appendChild(iconOverlay);

                // Hide header and body initially
                const header = document.getElementById('app-header');
                const appBody = document.getElementById('app-body');
                header.style.transition = 'none';
                header.style.opacity = '0';
                appBody.style.transition = 'none';
                appBody.style.opacity = '0';

                header.style.color = isDarkApp ? '#fff' : '#000';
                document.getElementById('app-title').innerText = appInfo.name;

                header.classList.remove('calc-header');
                if (id === 'calc') {
                    header.classList.add('calc-header');
                    win.classList.add('calc-app-bg');
                } else {
                    win.classList.remove('calc-app-bg');
                }

                document.getElementById('app-back').style.display = 'block';
                document.getElementById('app-back').onclick = AppManager.close;

                if (Apps[id] && Apps[id].render) {
                    Apps[id].render();
                } else {
                    if (appBody) {
                        appBody.innerHTML = `
                            <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:${isDarkApp ? '#fff' : '#000'}">
                                <i class="fas fa-tools" style="font-size:50px; margin-bottom:20px; opacity:0.3"></i>
                                <div style="font-size:22px; font-weight:600; margin-bottom:8px">Work in Progress</div>
                                <div style="font-size:15px; opacity:0.6; max-width:80%">This application is currently under development.</div>
                            </div>
                        `;
                    }
                }

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        document.body.classList.remove('closing-active');
                        document.body.classList.add('app-open');

                        // Animate geometry to fullscreen
                        win.style.transition = `
                            top ${0.5 * State.animationSpeed}s var(--ease-ios),
                            left ${0.5 * State.animationSpeed}s var(--ease-ios),
                            width ${0.5 * State.animationSpeed}s var(--ease-ios),
                            height ${0.5 * State.animationSpeed}s var(--ease-ios),
                            border-radius ${0.5 * State.animationSpeed}s ease`;

                        win.style.top = '0px';
                        win.style.left = '0px';
                        win.style.width = '100%';
                        win.style.height = '100%';
                        win.style.borderRadius = '35px';

                        // Fade out icon and fade in content early (visible by 60% of animation)
                        setTimeout(() => {
                            iconOverlay.style.opacity = '0';
                            header.style.transition = `opacity ${0.3 * State.animationSpeed}s ease`;
                            appBody.style.transition = `opacity ${0.3 * State.animationSpeed}s ease`;
                            header.style.opacity = '1';
                            appBody.style.opacity = '1';

                            // Restore proper background immediately when content starts fading in
                            win.classList.remove('app-animating');
                            win.style.transition = `
                                top ${0.5 * State.animationSpeed}s var(--ease-ios),
                                left ${0.5 * State.animationSpeed}s var(--ease-ios),
                                width ${0.5 * State.animationSpeed}s var(--ease-ios),
                                height ${0.5 * State.animationSpeed}s var(--ease-ios),
                                border-radius ${0.5 * State.animationSpeed}s ease,
                                background ${0.2 * State.animationSpeed}s ease`;

                            if (State.glassUI) {
                                win.style.background = State.darkMode ? 'rgba(30,30,30,0.65)' : 'rgba(243,243,243,0.65)';
                            } else {
                                win.style.background = isDarkApp ? '#000' : '#f2f2f7';
                            }

                            // Clean up icon overlay after fade
                            setTimeout(() => {
                                if (iconOverlay.parentNode) iconOverlay.remove();
                            }, 300 * State.animationSpeed);
                        }, 50 * State.animationSpeed);

                        setTimeout(() => { State.isAnimating = false; }, 500 * State.animationSpeed);
                    });
                });
            },

            close: () => {
                if (!State.activeApp) return;

                const win = document.getElementById('app-window');
                const id = State.activeApp;

                State.activeApp = null;
                State.isAnimating = true;
                AppManager.closingAppId = id;
                document.body.classList.add('closing-active');

                if (id === 'features') {
                    win.classList.add('closing-custom');
                    win.style.opacity = '0';
                    win.style.transform = 'translate(0, 0) scale(0.8)';
                    AppManager.closeTimeout = setTimeout(() => {
                        win.style.display = 'none';
                        win.classList.remove('closing', 'closing-custom');
                        AppManager.closingAppId = null;
                        document.body.classList.remove('app-open');
                        State.isAnimating = false;
                        document.getElementById('app-body').innerHTML = '';
                    }, 500 * State.animationSpeed);
                    return;
                }

                if (id === 'settings' && State.returnToFeatures) {
                    setTimeout(() => { AppManager.open('features'); }, 550 * State.animationSpeed);
                }

                Music.collapse();

                const appInfo = APPS.find(a => a.id === id);

                // Parent to Home Screen for shared transform/fade
                const homeScreen = document.getElementById('home-screen');
                const homeRect = homeScreen.getBoundingClientRect();
                // Avoid divide by zero
                const scale = (homeRect.width > 10 && homeScreen.offsetWidth > 0) ? (homeRect.width / homeScreen.offsetWidth) : 1;

                // Capture Window State
                const winRect = win.getBoundingClientRect();
                const comp = window.getComputedStyle(win);
                const curRadius = comp.borderRadius;

                // Calculate Local Start
                const startTop = (winRect.top - homeRect.top) / scale;
                const startLeft = (winRect.left - homeRect.left) / scale;
                const startW = winRect.width / scale;
                const startH = winRect.height / scale;

                // Calculate Local Target (Icon)
                const iconEl = document.getElementById(`icon-${id}`);
                let endTop = 0, endLeft = 0, endW = 0, endH = 0;

                if (iconEl) {
                    const iconBox = iconEl.querySelector('.icon-box') || iconEl;
                    const iRect = iconBox.getBoundingClientRect();
                    endTop = (iRect.top - homeRect.top) / scale;
                    endLeft = (iRect.left - homeRect.left) / scale;
                    endW = iRect.width / scale;
                    endH = iRect.height / scale;
                }

                // Create Clone
                const closeClone = document.createElement('div');
                closeClone.id = 'app-window-closing';
                closeClone.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: ${startW}px;
                    height: ${startH}px;
                    transform: translate(${startLeft}px, ${startTop}px);
                    background: ${appInfo.color || comp.backgroundColor};
                    z-index: 100; 
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    transform-origin: top left;
                    justify-content: center;
                    align-items: center;
                    border-radius: ${curRadius};
                `;

                closeClone.innerHTML = `<i class="fas ${appInfo.icon}" style="font-size: 28px; color: ${appInfo.text || 'white'}; opacity: 0;"></i>`;

                // Click handler for interruptible animation
                closeClone.style.cursor = 'pointer';
                closeClone.onclick = () => AppManager.open(id);

                // Append to Home Screen
                homeScreen.appendChild(closeClone);

                win.style.display = 'none';
                win.classList.remove('closing', 'calc-app-bg');

                AppManager.closingApp = closeClone;

                void closeClone.offsetWidth;

                closeClone.style.transition = `transform ${0.45 * State.animationSpeed}s cubic-bezier(0.32, 0.72, 0, 1), width ${0.45 * State.animationSpeed}s cubic-bezier(0.32, 0.72, 0, 1), height ${0.45 * State.animationSpeed}s cubic-bezier(0.32, 0.72, 0, 1), border-radius ${0.45 * State.animationSpeed}s cubic-bezier(0.32, 0.72, 0, 1), background ${0.45 * State.animationSpeed}s ease, opacity ${0.5 * State.animationSpeed}s ease`;

                closeClone.style.transform = `translate(${endLeft}px, ${endTop}px)`;
                closeClone.style.width = `${endW}px`;
                closeClone.style.height = `${endH}px`;
                closeClone.style.borderRadius = '16px';
                closeClone.style.background = appInfo.color;

                setTimeout(() => {
                    const cloneIcon = closeClone.querySelector('i');
                    if (cloneIcon) cloneIcon.style.opacity = '1';
                }, 100);

                setTimeout(() => document.body.classList.remove('app-open'), 50);

                if (iconEl) {
                    AppManager.iconFadeTimeout = setTimeout(() => {
                        iconEl.classList.remove('app-current');
                    }, 275 * State.animationSpeed);
                }

                AppManager.closeTimeout = setTimeout(() => {
                    document.body.classList.remove('closing-active');
                    if (closeClone) closeClone.remove();
                    AppManager.closingApp = null;
                    AppManager.closingAppId = null;
                    State.isAnimating = false;
                    document.body.classList.remove('dark-bar');
                    if (State.darkMode) document.querySelector('.home-bar').style.backgroundColor = '#fff';
                    else document.querySelector('.home-bar').style.backgroundColor = '#000';
                    if (Apps.settings.view) Apps.settings.view = 'root';
                }, 500 * State.animationSpeed);
            }
        };

        
        const Timer = {
            running: false, interval: null, finished: false,
            interruptedMusic: false,
            time: 300,
            ringtone: new Audio('https://dl.dropboxusercontent.com/scl/fi/j9qld9u2xcl0mihv2kuk1/ringtone-024-376907.mp3?rlkey=1tosgk2oyw73eqzczl8yoh1pz&st=pc8cfmrk'),

            init: () => {
                Timer.ringtone.loop = true;
                Timer.ringtone.addEventListener('error', (e) => {
                    console.warn("Local Ringtone failed, using fallback", e);
                    Timer.ringtone = new Audio('https://dl.dropboxusercontent.com/scl/fi/j9qld9u2xcl0mihv2kuk1/ringtone-024-376907.mp3?rlkey=1tosgk2oyw73eqzczl8yoh1pz&st=pc8cfmrk');
                    Timer.ringtone.loop = true;
                });
            },
            toggle: () => {
                if (Timer.running) Timer.stop(true); else Timer.start();
            },

            // Called by the UI "Start" button
            start: () => {
                if (Timer.running) return;

                let seconds = Timer.time;

                // If previously finished, reset
                if (Timer.finished) {
                    Timer.finished = false;
                    Timer.time = 300;
                    seconds = 300;
                }

                // Default fallback
                if (seconds <= 0 && !Timer.finished) seconds = 300;

                Timer.running = true;
                Timer.finished = false;

                // Music should CONTINUE playing until timer finishes
                // We do NOT pause here anymore.


                Island.update();

                Timer.interval = setInterval(() => {
                    seconds--;
                    Timer.time = seconds;

                    if (seconds < 0) {
                        // Timer finished!
                        if (!Timer.finished) {
                            Timer.finished = true;

                            // Pause Music NOW if active
                            if (Music.active) {
                                Music.audio.pause();
                                Timer.interruptedMusic = true;
                            }

                            // Play sound with forced loop
                            Timer.ringtone.loop = true;
                            Timer.ringtone.currentTime = 0;
                            Timer.ringtone.play().catch(e => console.log('Audio play error', e));
                            Island.update();
                            Island.expand('timerDone');
                        }
                        // Continue updating UI for negative values (0:01+)
                        Timer.updateUI();
                    } else {
                        Timer.updateUI();
                    }
                }, 1000);
            },

            stop: (pause) => {
                clearInterval(Timer.interval);
                Timer.running = false;
                if (!pause) {
                    // Full Stop
                    Timer.finished = false;
                    Timer.ringtone.pause();
                    Timer.ringtone.currentTime = 0;
                    Timer.time = 300; // Reset
                    Timer.updateUI();

                    if (Island.expanded === 'timer' || Island.expanded === 'timerDone') Island.collapse();

                    // Resume Music if it was interrupted by THIS timer
                    if (Timer.interruptedMusic) {
                        Music.toggle(); // Resume
                        Timer.interruptedMusic = false; // Reset flag
                    }
                }
                Island.update();
            },

            // Method called by Clock App to set time in minutes
            setCustom: (mins) => {
                Timer.time = mins * 60;
                Timer.finished = false;
                Timer.updateUI();
            },

            updateUI: () => {
                let absTime = Math.abs(Timer.time);
                const m = Math.floor(absTime / 60);
                const s = absTime % 60;

                // Display logic: "0:01" normal, "0:01+" for finished
                let txt = `${m}:${s.toString().padStart(2, '0')}`;
                if (Timer.time < 0) txt = txt + "+";

                if (document.getElementById('di-timer-val')) document.getElementById('di-timer-val').innerText = txt;
                if (document.getElementById('di-timer-mini-val')) document.getElementById('di-timer-mini-val').innerText = txt;
                if (document.getElementById('stopwatch-val')) document.getElementById('stopwatch-val').innerText = txt;

                // Update 'timerDone' view content
                if (Timer.finished && document.querySelector('#view-timer-done span')) {
                    document.querySelector('#view-timer-done span').innerText = txt;
                }
            }
        };



        
        const Island = {
            expanded: null, unlockTimer: null,
            renderIdle: () => {
                if (State.punchHole) {
                    document.getElementById('view-idle').innerHTML = ''; // Clear for punch hole
                    return;
                }
                const c = document.getElementById('view-idle');
                c.innerHTML = '';
                if (State.islandMode === 'waves') c.innerHTML = `<div class="di-wave"><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div></div>`;
                else if (State.islandMode === 'clock') c.innerHTML = `<span id="di-idle-text" style="color:var(--island-text); font-size:12px; font-weight:600">12:00</span>`;
                else if (State.islandMode === 'text') c.innerHTML = `<span style="color:var(--accent); font-size:12px; font-weight:bold">RealOS</span>`;
                OS.updateTime();
            },
            update: () => {
                const island = document.getElementById('dynamic-island');
                const wrapper = document.getElementById('island-wrap');
                const device = document.getElementById('device');
                const views = document.querySelectorAll('.di-view');
                island.className = ''; wrapper.className = '';
                if (device) device.classList.remove('di-expanded-global');

                // Punch Hole Logic
                if (State.punchHole && !Music.active && !Timer.running && !Timer.finished && !Island.expanded) island.classList.add('punch-hole');

                if (State.islandColor.includes('grad') || State.islandColor === 'rainbow') {
                    if (State.islandColor === 'rainbow') island.classList.add('island-rainbow'); else island.classList.add('island-purple-grad');
                }

                // Music Gradient Logic
                const bgBlur = document.getElementById('di-bg-blur');
                if (State.musicGradient && (Island.expanded === 'music' || (Music.active && !Timer.running && !Island.expanded))) {
                    const track = Music.library[Music.currentIdx];
                    if (track && track.art) {
                        bgBlur.style.backgroundImage = `url('${track.art}')`;
                        bgBlur.style.opacity = '1';
                    } else {
                        bgBlur.style.opacity = '0';
                    }
                } else {
                    if (bgBlur) bgBlur.style.opacity = '0';
                }

                if (Island.expanded) {
                    if (device) device.classList.add('di-expanded-global');
                    wrapper.classList.add('main-expanded');
                    if (Island.expanded === 'unlocked') {
                        if (Music.active || Timer.running || Timer.finished) wrapper.classList.remove('main-expanded'); else island.classList.add('expanded-unlock');
                        views.forEach(v => v.classList.remove('active'));
                        document.getElementById('view-unlocked').classList.add('active');
                    } else if (Island.expanded === 'welcome') {
                        island.classList.add('notify');
                        island.classList.add('island-purple-grad');
                        views.forEach(v => v.classList.remove('active'));
                        const v = document.getElementById('view-welcome');
                        v.classList.add('active');
                        v.style.pointerEvents = 'auto';
                        bgBlur.style.opacity = '1';
                        bgBlur.style.backgroundImage = 'radial-gradient(circle at center, #8000ff, #000)';
                    } else {
                        island.classList.add('expanded');
                        views.forEach(v => v.classList.remove('active'));
                        if (Island.expanded === 'music') document.getElementById('view-music-exp').classList.add('active');
                        else if (Island.expanded === 'timer') { island.classList.add('timer-mode'); document.getElementById('view-timer-exp').classList.add('active'); }
                        else if (Island.expanded === 'timerDone') { island.classList.add('notify'); document.getElementById('view-timer-done').classList.add('active'); }
                        else if (Island.expanded === 'notify') { island.classList.add('notify'); document.getElementById('view-notify').classList.add('active'); }
                    }
                    return;
                }
                views.forEach(v => v.classList.remove('active'));
                if (Music.active && (Timer.running || Timer.finished)) { wrapper.classList.add('split'); document.getElementById('view-music-mini').classList.add('active'); document.getElementById('dynamic-island-sec').style.display = 'flex'; }
                else if (Timer.running) { document.getElementById('view-timer-mini').classList.add('active'); }
                else if (Timer.finished) { island.classList.add('notify'); document.getElementById('view-timer-done').classList.add('active'); }
                else if (Music.active) { document.getElementById('view-music-mini').classList.add('active'); }
                else { document.getElementById('view-idle').classList.add('active'); Island.renderIdle(); }
            },
            tapMain: (e) => {
                e.stopPropagation();
                if (Timer.finished) {
                    Timer.stop();
                    return;
                }
                if (Island.expanded === 'welcome') {
                    Island.collapse();
                    AppManager.open('features');
                    return;
                }
                if (Island.expanded === 'welcome') {
                    // Island.collapse(); // Don't collapse immediately for smoother transition?
                    // Actually request said to open app window.
                    Island.collapse();
                    AppManager.open('features');
                    return;
                }
                if (Island.expanded) { if (Island.expanded === 'unlocked') clearTimeout(Island.unlockTimer); Island.collapse(); }
                else if (Music.active) Island.expand('music');
                else if (Timer.running) Island.expand('timer');
            },
            tapSec: (e) => {
                e.stopPropagation();
                if (Timer.running || Timer.finished) Island.expand('timer');
            },
            expand: (type) => {
                if (type === 'timer' && Timer.finished) type = 'timerDone';
                Island.expanded = type;
                Island.update();
            },
            collapse: () => { Island.expanded = null; Island.update(); },
            notify: (title, msg, icon) => {
                document.getElementById('notify-title').innerText = title;
                // FIX: Use innerHTML to allow gradients
                document.getElementById('notify-msg').innerHTML = msg;
                document.getElementById('notify-icon').className = `fas ${icon}`;
                Island.expand('notify');
                setTimeout(() => { if (Island.expanded === 'notify') Island.collapse(); }, 5000); // 5 seconds
            },
            notifyUnlock: () => {
                if (Island.expanded === 'unlocked') return;
                Island.expand('unlocked');
                Island.unlockTimer = setTimeout(() => { if (Island.expanded === 'unlocked') Island.collapse(); }, 2000);
            }
        };

        
        const Music = {
            active: false, currentIdx: 0, library: [], audio: document.getElementById('audio-player'), scrubbing: false,
            init: () => {
                Music.audio.onended = () => Music.next();
                Music.audio.ontimeupdate = () => Music.updateProgress();
            },
            loadFromDB: async () => {
                const songs = await Storage.loadSongs();
                if (songs.length > 0) Music.library = songs;
            },
            playTrack: (index) => {
                if (!Music.library[index]) return;
                const prevTrack = Music.library[Music.currentIdx];
                const prevHadLyrics = prevTrack && prevTrack.lrcData && prevTrack.lrcData.length > 0;
                Music.currentIdx = index;
                const track = Music.library[index];
                const currentHasLyrics = track && track.lrcData && track.lrcData.length > 0;
                let src = track.url;
                if (track.blob && !src) src = URL.createObjectURL(track.blob);
                Music.audio.src = src;
                Music.active = true;
                Music.audio.play().catch(e => console.log("Play failed:", e));
                Music.updateUI();
                Island.update();
                // Handle lyrics transition
                if (typeof Lyrics !== 'undefined') {
                    Lyrics.onSongChange(prevHadLyrics, currentHasLyrics);
                }
                if (!State.poweredOn && State.aod.enabled) document.getElementById('aod-music').style.display = 'flex';
            },
            toggle: () => {
                if (!Music.active && Music.library.length > 0) { Music.playTrack(0); return; }
                if (Music.audio.paused) { Music.audio.play(); Music.active = true; } else { Music.audio.pause(); }
                Music.updateUI();
            },
            next: () => {
                if (Music.repeat) {
                    Music.playTrack(Music.currentIdx);
                    return;
                }
                let nextIdx;
                if (Music.shuffle) {
                    // Simple random implementation
                    if (Music.library.length > 1) {
                        let newIdx = Music.currentIdx;
                        let attempts = 0;
                        while (newIdx === Music.currentIdx && attempts < 5) {
                            newIdx = Math.floor(Math.random() * Music.library.length);
                            attempts++;
                        }
                        nextIdx = newIdx;
                    } else {
                        nextIdx = 0;
                    }
                } else {
                    nextIdx = Music.currentIdx + 1;
                    if (nextIdx >= Music.library.length) nextIdx = 0;
                }
                Music.playTrack(nextIdx);
            },
            prev: () => {
                let prev = Music.currentIdx - 1;
                if (prev < 0) prev = Music.library.length - 1;
                Music.playTrack(prev);
            },
            startScrub: (e, elem) => { Music.scrubbing = true; Music.seek(e, elem); },
            handleScrub: (e, elem) => { if (Music.scrubbing) Music.seek(e, elem); },
            endScrub: () => { Music.scrubbing = false; },
            seek: (e, elem) => {
                const rect = elem.getBoundingClientRect();
                let percent = (e.clientX - rect.left) / rect.width;
                if (percent < 0) percent = 0; if (percent > 1) percent = 1;
                if (Music.audio.duration) { Music.audio.currentTime = percent * Music.audio.duration; Music.updateProgress(); }
            },
            updateProgress: () => {
                if (!Music.active && !Music.scrubbing) return;
                const curr = Music.audio.currentTime;
                const dur = Music.audio.duration || 0;
                const pct = (curr / dur) * 100;
                const fmt = (t) => { const m = Math.floor(t / 60); const s = Math.floor(t % 60).toString().padStart(2, '0'); return `${m}:${s}`; };

                ['exp', 'fs'].forEach(p => {
                    const f = document.getElementById(`${p}-prog-fill`); if (f) f.style.width = `${pct}%`;
                    const c = document.getElementById(`${p}-curr-time`); if (c) c.innerText = fmt(curr);
                    const t = document.getElementById(`${p}-tot-time`); if (t) t.innerText = fmt(dur);
                });

                // Sync lyrics
                if (typeof Lyrics !== 'undefined') {
                    Lyrics.sync();
                }
            },
            handleFile: (e) => {
                const f = e.target.files[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const blob = new Blob([evt.target.result], { type: f.type });
                    const newTrack = { id: Date.now(), title: f.name, artist: "Unknown Artist", blob: blob, art: null };
                    jsmediatags.read(blob, {
                        onSuccess: (tag) => {
                            newTrack.title = tag.tags.title || f.name;
                            newTrack.artist = tag.tags.artist || "Unknown Artist";
                            if (tag.tags.picture) {
                                const data = tag.tags.picture.data;
                                let base64 = "";
                                for (let i = 0; i < data.length; i++) base64 += String.fromCharCode(data[i]);
                                newTrack.art = `data:${tag.tags.picture.format};base64,${window.btoa(base64)}`;
                            }
                            Storage.saveSong(newTrack);
                            Music.library.unshift(newTrack);
                            Apps.music.render();
                            Music.playTrack(0);
                        },
                        onError: (err) => {
                            Storage.saveSong(newTrack);
                            Music.library.unshift(newTrack);
                            Apps.music.render();
                            Music.playTrack(0);
                        }
                    });
                };
                reader.readAsArrayBuffer(f);
                e.target.value = '';
            },
            removeTrack: (idx) => {
                const track = Music.library[idx];
                OS.showPopup('Remove Song', `Are you sure you want to remove ${track.title}?`, () => {
                    if (track.id) Storage.removeSong(track.id);
                    Music.library.splice(idx, 1);
                    if (Music.currentIdx === idx) Music.audio.pause();
                    Apps.music.render();
                });
            },
            expand: () => {
                document.getElementById('music-fs-overlay').classList.add('active');
                Music.updateUI();
            },
            collapse: () => {
                const overlay = document.getElementById('music-fs-overlay');
                // Close lyrics mode when collapsing fullscreen player
                if (Lyrics && Lyrics.active) {
                    Lyrics.active = false;
                    overlay.classList.remove('lyrics-active');
                    document.getElementById('lyrics-btn').classList.remove('active');
                    document.getElementById('lyrics-container').innerHTML = '';
                }
                overlay.classList.remove('active');
            },
            updateUI: () => {
                const track = Music.library[Music.currentIdx];
                if (!track) return;
                const artUrl = track.art || 'linear-gradient(45deg, #333, #666)';
                const artStyle = track.art ? `background-image:url('${track.art}')` : `background:${artUrl}`;
                const blurStyle = track.art ? `background-image:url('${track.art}')` : `background:#333`;

                document.getElementById('mini-art').style = `width:24px; height:24px; margin-right:10px; border-radius:4px; ${artStyle}; background-size:cover;`;
                document.getElementById('exp-art').style = `width:55px; height:55px; border-radius:12px; ${artStyle}; background-size:cover;`;
                document.getElementById('exp-title').innerText = track.title;
                document.getElementById('exp-artist').innerText = track.artist;
                document.getElementById('exp-play').className = Music.audio.paused ? 'fas fa-play' : 'fas fa-pause';

                // Wave Animation State
                const wave = document.querySelector('.di-wave');
                if (wave) {
                    if (Music.audio.paused) wave.classList.add('paused');
                    else wave.classList.remove('paused');
                }

                if (document.querySelector('.mini-player-bg')) {
                    document.querySelector('.mini-player-bg').style = `${blurStyle}; background-size:cover; filter: blur(30px); opacity: 0.6;`;
                    document.getElementById('mp-title').innerText = track.title;
                    document.getElementById('mp-artist').innerText = track.artist;
                    document.getElementById('mp-art').style = `width:50px; height:50px; border-radius:8px; flex-shrink:0; margin-right:15px; ${artStyle}; background-size:cover;`;
                    document.getElementById('mp-play-icon').className = Music.audio.paused ? 'fas fa-play' : 'fas fa-pause';
                }

                document.getElementById('fs-bg').style = `${blurStyle}; background-size:cover; filter: blur(60px); opacity: 0.5;`;
                document.getElementById('fs-art').style = `${artStyle}; background-size:cover;`;
                document.getElementById('fs-title').innerText = track.title;
                document.getElementById('fs-artist').innerText = track.artist;
                document.getElementById('fs-play').className = Music.audio.paused ? 'fas fa-play' : 'fas fa-pause';

                document.getElementById('aod-title').innerText = track.title;
                document.getElementById('aod-artist').innerText = track.artist;
                document.getElementById('aod-art').style = `${artStyle}; background-size:cover;`;

                // Update playing indicators
                Music.updatePlayingIndicators();

                // Update repeat/shuffle button states
                const shuffleBtn = document.getElementById('fs-shuffle');
                const repeatBtn = document.getElementById('fs-repeat');
                if (shuffleBtn) shuffleBtn.classList.toggle('active', Music.shuffle);
                if (repeatBtn) repeatBtn.classList.toggle('active', Music.repeat);
            },

            shuffle: false,
            repeat: false,

            toggleShuffle: () => {
                Music.shuffle = !Music.shuffle;
                const btn = document.getElementById('fs-shuffle');
                if (btn) btn.classList.toggle('active', Music.shuffle);
                Island.notify(Music.shuffle ? 'Shuffle On' : 'Shuffle Off', '', 'fa-random');
            },

            toggleRepeat: () => {
                Music.repeat = !Music.repeat;
                const btn = document.getElementById('fs-repeat');
                if (btn) btn.classList.toggle('active', Music.repeat);
                Island.notify(Music.repeat ? 'Repeat On' : 'Repeat Off', '', 'fa-redo');
            },

            updatePlayingIndicators: () => {
                // Update all song list speaker icons
                const indicators = document.querySelectorAll('.song-playing-indicator');
                indicators.forEach(ind => {
                    const songItem = ind.closest('.song-item');
                    if (songItem) {
                        const idx = parseInt(songItem.dataset.songIdx);
                        const isPlaying = Music.currentIdx === idx && Music.active;
                        ind.classList.toggle('active', isPlaying);
                    }
                });
            }
        };
        Music.init();

        
        const Lyrics = {
            active: false,
            currentLineIdx: -1,

            // Parse LRC format: [mm:ss.xx]lyric text
            parse: (lrcText) => {
                const lines = lrcText.split('\n');
                const lyrics = [];
                const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

                lines.forEach(line => {
                    const matches = [...line.matchAll(timeRegex)];
                    if (matches.length > 0) {
                        const text = line.replace(timeRegex, '').trim();
                        if (text) {
                            matches.forEach(match => {
                                const minutes = parseInt(match[1]);
                                const seconds = parseInt(match[2]);
                                const ms = parseInt(match[3]);
                                const time = minutes * 60 + seconds + ms / 1000;
                                lyrics.push({ time, text });
                            });
                        }
                    }
                });

                // Sort by time
                lyrics.sort((a, b) => a.time - b.time);
                return lyrics;
            },

            toggleMode: () => {
                const overlay = document.getElementById('music-fs-overlay');
                const track = Music.library[Music.currentIdx];

                if (Lyrics.active) {
                    // Close lyrics mode
                    Lyrics.active = false;
                    overlay.classList.remove('lyrics-active');
                    document.getElementById('lyrics-btn').classList.remove('active');
                    document.getElementById('lyrics-container').innerHTML = '';
                    return;
                }

                // Check if track has lyrics
                if (!track || !track.lrcData || track.lrcData.length === 0) {
                    // Show popup
                    const footer = document.getElementById('osm-footer');
                    document.getElementById('osm-title').innerText = 'No Lyrics';
                    document.getElementById('osm-msg').innerText = "You haven't added a .lrc file to this song";
                    footer.innerHTML = '';

                    const cancelBtn = document.createElement('div');
                    cancelBtn.className = 'osm-btn secondary';
                    cancelBtn.innerText = 'Cancel';
                    cancelBtn.onclick = OS.hidePopup;

                    const addBtn = document.createElement('div');
                    addBtn.className = 'osm-btn primary';
                    addBtn.innerText = 'Add';
                    addBtn.onclick = () => {
                        OS.hidePopup();
                        Lyrics.promptAddLrc();
                    };

                    footer.appendChild(cancelBtn);
                    footer.appendChild(addBtn);
                    document.getElementById('modal-overlay').classList.add('active');
                    return;
                }

                // Open lyrics mode
                Lyrics.active = true;
                overlay.classList.add('lyrics-active');
                document.getElementById('lyrics-btn').classList.add('active');
                Lyrics.render();
            },

            render: () => {
                const container = document.getElementById('lyrics-container');
                const track = Music.library[Music.currentIdx];

                if (!track || !track.lrcData) {
                    container.innerHTML = '<div class="lyric-line" style="opacity:0.5">No lyrics available</div>';
                    return;
                }

                container.innerHTML = track.lrcData.map((line, i) =>
                    `<div class="lyric-line" data-idx="${i}" onclick="Lyrics.seekTo(${line.time})">${line.text}</div>`
                ).join('');

                Lyrics.currentLineIdx = -1;
                Lyrics.sync();
            },

            sync: () => {
                if (!Lyrics.active) return;

                const track = Music.library[Music.currentIdx];
                if (!track || !track.lrcData) return;

                const currentTime = Music.audio.currentTime;
                let newIdx = -1;

                for (let i = track.lrcData.length - 1; i >= 0; i--) {
                    if (currentTime >= track.lrcData[i].time) {
                        newIdx = i;
                        break;
                    }
                }

                if (newIdx !== Lyrics.currentLineIdx) {
                    Lyrics.currentLineIdx = newIdx;
                    Lyrics.highlightLine(newIdx);
                }
            },

            highlightLine: (idx) => {
                const container = document.getElementById('lyrics-container');
                const lines = container.querySelectorAll('.lyric-line');

                lines.forEach((line, i) => {
                    line.classList.remove('active', 'past');
                    if (i === idx) {
                        line.classList.add('active');
                        // Scroll into view
                        line.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else if (i < idx) {
                        line.classList.add('past');
                    }
                });
            },

            seekTo: (time) => {
                Music.audio.currentTime = time;
            },

            promptAddLrc: () => {
                const input = document.getElementById('lrc-input');
                input.onclick = null;
                input.onchange = (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    // Validate file extension
                    if (!file.name.toLowerCase().endsWith('.lrc')) {
                        OS.showPopup('Invalid File', 'Only .lrc files are accepted. Please select a valid LRC file.');
                        e.target.value = '';
                        return;
                    }

                    const reader = new FileReader();
                    reader.onload = (evt) => {
                        const lrcText = evt.target.result;
                        const parsed = Lyrics.parse(lrcText);

                        if (parsed.length > 0) {
                            Music.library[Music.currentIdx].lrcData = parsed;
                            Storage.saveSongs(Music.library);
                            Island.notify('Lyrics Added', `${parsed.length} lines loaded`, 'fa-music');
                            // Auto-enter lyrics mode after upload
                            if (!Lyrics.active) {
                                Lyrics.toggleMode();
                            } else {
                                Lyrics.render();
                            }
                        } else {
                            OS.showPopup('Error', 'Could not parse LRC file');
                        }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                };
                input.click();
            },

            confirmRemove: () => {
                const track = Music.library[Music.currentIdx];
                if (!track || !track.lrcData) return;

                const footer = document.getElementById('osm-footer');
                document.getElementById('osm-title').innerText = 'Remove Lyrics';
                document.getElementById('osm-msg').innerText = 'Are you sure you want to remove the .lrc file from this song?';
                footer.innerHTML = '';

                const noBtn = document.createElement('div');
                noBtn.className = 'osm-btn secondary';
                noBtn.innerText = 'No';
                noBtn.onclick = OS.hidePopup;

                const yesBtn = document.createElement('div');
                yesBtn.className = 'osm-btn primary';
                yesBtn.style.background = '#ff3b30';
                yesBtn.innerText = 'Yes';
                yesBtn.onclick = () => {
                    delete Music.library[Music.currentIdx].lrcData;
                    Storage.saveSongs(Music.library);
                    Lyrics.toggleMode(); // Close lyrics mode
                    OS.hidePopup();
                    Island.notify('Lyrics Removed', 'LRC file has been removed', 'fa-trash');
                };

                footer.appendChild(noBtn);
                footer.appendChild(yesBtn);
                document.getElementById('modal-overlay').classList.add('active');
            },

            // Called when song changes - handle transition
            onSongChange: (prevHadLyrics, currentHasLyrics) => {
                if (Lyrics.active) {
                    if (!currentHasLyrics) {
                        // Auto-close lyrics mode if new song has no lyrics
                        Lyrics.active = false;
                        document.getElementById('music-fs-overlay').classList.remove('lyrics-active');
                        document.getElementById('lyrics-btn').classList.remove('active');
                        document.getElementById('lyrics-container').innerHTML = '';
                    } else {
                        // Update lyrics display for new song
                        Lyrics.render();
                    }
                }
            }
        };

        
        const Apps = {
            placeholder: { render: () => document.getElementById('app-body').innerHTML = `<div style="height:100%; display:flex; justify-content:center; align-items:center; opacity:0.5">Under Construction</div>` },

            // REDESIGNED NOTES APP
            notes: {
                render: () => {
                    const body = document.getElementById('app-body');
                    document.getElementById('app-header').style.display = 'none';
                    let notesHTML = '';

                    State.notes.forEach((note, i) => {
                        notesHTML += `
                    <div class="note-card ${note.color}">
                        <div style="font-weight:600; margin-bottom:5px; white-space:pre-wrap;">${note.text}</div>
                        <div class="note-del" onclick="event.stopPropagation(); Apps.notes.delete(${i})"><i class="fas fa-trash"></i></div>
                    </div>`;
                    });

                    if (State.notes.length === 0) {
                        notesHTML = `<div style="text-align:center; color:#888; margin-top:50px;">No notes yet</div>`;
                    }

                    body.innerHTML = `
                <div style="padding:20px 20px 80px; overflow-y:auto; height:100%;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h1 style="margin:0; font-size:32px; font-weight:700;">Notes</h1>
                        <div style="display:flex; gap:10px;">
                            <div style="width:35px; height:35px; background:rgba(128,128,128,0.2); border-radius:10px; display:flex; justify-content:center; align-items:center;"><i class="fas fa-search"></i></div>
                            <div style="width:35px; height:35px; background:rgba(128,128,128,0.2); border-radius:10px; display:flex; justify-content:center; align-items:center;"><i class="fas fa-info-circle"></i></div>
                        </div>
                    </div>
                    
                    <div class="notes-grid">
                        ${notesHTML}
                    </div>
                    
                    <div class="notes-add-btn" onclick="Apps.notes.showAdd()"><i class="fas fa-plus"></i></div>
                </div>
            `;
                },
                showAdd: () => {
                    document.getElementById('new-note-modal').classList.add('active');
                    // Init color selection
                    document.querySelectorAll('.color-opt').forEach(el => {
                        el.onclick = function () {
                            document.querySelectorAll('.color-opt').forEach(c => c.classList.remove('selected'));
                            this.classList.add('selected');
                        }
                    });
                },
                cancelAdd: () => {
                    document.getElementById('new-note-modal').classList.remove('active');
                    document.getElementById('nn-text').value = '';
                },
                saveAdd: () => {
                    const text = document.getElementById('nn-text').value;
                    if (!text.trim()) return;
                    const colorEl = document.querySelector('.color-opt.selected');
                    const color = colorEl ? colorEl.getAttribute('data-c') : 'note-yellow';

                    State.notes.push({ text: text, color: color });
                    Storage.saveSettings();
                    Apps.notes.cancelAdd();
                    Apps.notes.render();
                },
                delete: (idx) => {
                    State.notes.splice(idx, 1);
                    Storage.saveSettings();
                    Apps.notes.render();
                }
            },

            camera: {
                render: () => {
                    const body = document.getElementById('app-body');
                    document.getElementById('app-header').style.display = 'none';
                    body.innerHTML = `
                <div style="height:100%; background:black; color:white; display:flex; flex-direction:column;">
                    <div style="padding:10px 20px; display:flex; justify-content:space-between; align-items:center; z-index:20;">
                        <i class="fas fa-bolt" style="font-size:18px;"></i>
                        <div style="width:20px; height:20px; background:#333; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:10px;"><i class="fas fa-chevron-up"></i></div>
                        <i class="fas fa-record-vinyl" style="font-size:18px;"></i>
                    </div>
                    
                    <div style="flex:1; background:#111; position:relative; overflow:hidden;">
                        <div style="position:absolute; inset:0; display:flex; flex-direction:column;">
                            <div style="flex:1; border-bottom:1px solid rgba(255,255,255,0.1)"></div>
                            <div style="flex:1; border-bottom:1px solid rgba(255,255,255,0.1)"></div>
                            <div style="flex:1"></div>
                        </div>
                        <div style="position:absolute; inset:0; display:flex;">
                            <div style="flex:1; border-right:1px solid rgba(255,255,255,0.1)"></div>
                            <div style="flex:1; border-right:1px solid rgba(255,255,255,0.1)"></div>
                            <div style="flex:1"></div>
                        </div>
                        <div style="position:absolute; bottom:10px; left:50%; transform:translateX(-50%); display:flex; gap:10px; font-size:12px; font-weight:600; background:rgba(0,0,0,0.5); padding:5px 10px; border-radius:20px;">
                            <span>0.5</span><span style="color:#fcd116">1x</span><span>3</span>
                        </div>
                    </div>

                    <div style="height:140px; background:black; display:flex; flex-direction:column; justify-content:center; padding-bottom:20px;">
                        <div style="display:flex; justify-content:center; gap:20px; font-size:13px; font-weight:600; color:#888; margin-bottom:20px;">
                            <span>CINEMATIC</span><span>VIDEO</span><span style="color:#fcd116">PHOTO</span><span>PORTRAIT</span><span>PANO</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:0 30px;">
                            <div style="width:45px; height:45px; background:#333; border-radius:6px; overflow:hidden; border:1px solid #555;">
                                <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" style="width:100%; height:100%; object-fit:cover; opacity:0.7">
                            </div>
                            <div style="width:70px; height:70px; border-radius:50%; border:4px solid white; display:flex; justify-content:center; align-items:center; cursor:pointer;">
                                <div style="width:60px; height:60px; background:white; border-radius:50%; transition:0.1s;" onmousedown="this.style.transform='scale(0.9)'" onmouseup="this.style.transform='scale(1)'"></div>
                            </div>
                            <div style="width:45px; height:45px; background:#1c1c1e; border-radius:50%; display:flex; justify-content:center; align-items:center; font-size:20px;">
                                <i class="fas fa-sync-alt"></i>
                            </div>
                        </div>
                    </div>
                </div>`;
                }
            },

            phone: {
                num: '',
                render: () => {
                    document.getElementById('app-body').innerHTML = `
                <div style="height:100%; display:flex; flex-direction:column;">
                    <div class="phone-display" id="p-disp"></div>
                    <div class="phone-grid">
                        <button class="num-btn" onclick="Apps.phone.add('1')"><div class="nb-big">1</div><div class="nb-sm">&nbsp;</div></button>
                        <button class="num-btn" onclick="Apps.phone.add('2')"><div class="nb-big">2</div><div class="nb-sm">ABC</div></button>
                        <button class="num-btn" onclick="Apps.phone.add('3')"><div class="nb-big">3</div><div class="nb-sm">DEF</div></button>
                        <button class="num-btn" onclick="Apps.phone.add('4')"><div class="nb-big">4</div><div class="nb-sm">GHI</div></button>
                        <button class="num-btn" onclick="Apps.phone.add('5')"><div class="nb-big">5</div><div class="nb-sm">JKL</div></button>
                        <button class="num-btn" onclick="Apps.phone.add('6')"><div class="nb-big">6</div><div class="nb-sm">MNO</div></button>
                        <button class="num-btn" onclick="Apps.phone.add('7')"><div class="nb-big">7</div><div class="nb-sm">PQRS</div></button>
                        <button class="num-btn" onclick="Apps.phone.add('8')"><div class="nb-big">8</div><div class="nb-sm">TUV</div></button>
                        <button class="num-btn" onclick="Apps.phone.add('9')"><div class="nb-big">9</div><div class="nb-sm">WXYZ</div></button>
                        <button class="num-btn" onclick="Apps.phone.add('*')"><div class="nb-big" style="font-size:36px; padding-top:10px">*</div></button>
                        <button class="num-btn" onclick="Apps.phone.add('0')"><div class="nb-big">0</div><div class="nb-sm">+</div></button>
                        <button class="num-btn" onclick="Apps.phone.add('#')"><div class="nb-big">#</div></button>
                        <button class="call-btn" onclick="Apps.phone.call()"><i class="fas fa-phone"></i></button>
                    </div>
                </div>
            `;
                    Apps.phone.num = '';
                },
                add: (n) => { if (Apps.phone.num.length < 15) { Apps.phone.num += n; document.getElementById('p-disp').innerText = Apps.phone.num; } },
                call: () => { OS.showPopup('Call Failed', 'Sim card isn’t available, please try again later.'); }
            },

            clock: {
                selectedHours: 0,
                selectedMinutes: 5,
                selectedSeconds: 0,
                render: () => {
                    // Generate scroll items
                    const genItems = (max, padLen = 2) => {
                        let html = '<div class="timer-digit-item" style="opacity:0"></div>'; // Spacer top
                        for (let i = 0; i <= max; i++) {
                            html += `<div class="timer-digit-item" data-val="${i}">${i.toString().padStart(padLen, '0')}</div>`;
                        }
                        html += '<div class="timer-digit-item" style="opacity:0"></div>'; // Spacer bottom
                        return html;
                    };

                    document.getElementById('app-body').innerHTML = `
                <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; padding: 20px;">
                    <div style="font-size:18px; color:#888; margin-bottom:20px;">Set Timer Duration</div>
                    
                    <div class="timer-scroll-container">
                        <div>
                            <div class="timer-scroll-digit" id="scroll-hours">${genItems(23)}</div>
                            <div class="timer-scroll-label">Hours</div>
                        </div>
                        <div class="timer-scroll-separator">:</div>
                        <div>
                            <div class="timer-scroll-digit" id="scroll-minutes">${genItems(59)}</div>
                            <div class="timer-scroll-label">Minutes</div>
                        </div>
                        <div class="timer-scroll-separator">:</div>
                        <div>
                            <div class="timer-scroll-digit" id="scroll-seconds">${genItems(59)}</div>
                            <div class="timer-scroll-label">Seconds</div>
                        </div>
                    </div>
                    
                    <div id="stopwatch-val" style="font-size:60px; font-weight:200; font-family:monospace; margin:20px 0">${Math.floor(Timer.time / 60).toString().padStart(2, '0')}:${(Timer.time % 60).toString().padStart(2, '0')}</div>
                    
                    <div style="display:flex; gap:20px; margin-top:20px;">
                        <button class="btn-pill" style="width:80px; background:#333; border-radius:50%; height:80px;" onclick="Timer.stop()">Cancel</button>
                        <button class="btn-pill" style="width:80px; background:#34c759; border-radius:50%; height:80px; color:#000;" onclick="Apps.clock.start()">Start</button>
                    </div>
                </div>`;

                    // Setup scroll event listeners
                    Apps.clock.initScroller('scroll-hours', 'selectedHours', 23);
                    Apps.clock.initScroller('scroll-minutes', 'selectedMinutes', 59);
                    Apps.clock.initScroller('scroll-seconds', 'selectedSeconds', 59);

                    // Set initial scroll positions
                    setTimeout(() => {
                        Apps.clock.scrollToValue('scroll-hours', Apps.clock.selectedHours);
                        Apps.clock.scrollToValue('scroll-minutes', Apps.clock.selectedMinutes);
                        Apps.clock.scrollToValue('scroll-seconds', Apps.clock.selectedSeconds);
                    }, 50);
                },
                initScroller: (id, prop, max) => {
                    const el = document.getElementById(id);
                    if (!el) return;

                    // Drag state
                    let isDragging = false;
                    let startY = 0;
                    let startScroll = 0;

                    // Mouse drag support
                    el.addEventListener('mousedown', (e) => {
                        isDragging = true;
                        startY = e.clientY;
                        startScroll = el.scrollTop;
                        el.style.cursor = 'grabbing';
                        e.preventDefault();
                    });

                    document.addEventListener('mousemove', (e) => {
                        if (!isDragging) return;
                        const deltaY = startY - e.clientY;
                        el.scrollTop = startScroll + deltaY;
                    });

                    document.addEventListener('mouseup', () => {
                        if (isDragging) {
                            isDragging = false;
                            el.style.cursor = 'grab';
                            // Snap to nearest item
                            const itemHeight = 50;
                            const targetScroll = Math.round(el.scrollTop / itemHeight) * itemHeight;
                            el.scrollTo({ top: targetScroll, behavior: 'smooth' });
                        }
                    });

                    // Touch drag support
                    el.addEventListener('touchstart', (e) => {
                        isDragging = true;
                        startY = e.touches[0].clientY;
                        startScroll = el.scrollTop;
                    }, { passive: true });

                    el.addEventListener('touchmove', (e) => {
                        if (!isDragging) return;
                        const deltaY = startY - e.touches[0].clientY;
                        el.scrollTop = startScroll + deltaY;
                    }, { passive: true });

                    el.addEventListener('touchend', () => {
                        if (isDragging) {
                            isDragging = false;
                            // Snap to nearest item
                            const itemHeight = 50;
                            const targetScroll = Math.round(el.scrollTop / itemHeight) * itemHeight;
                            el.scrollTo({ top: targetScroll, behavior: 'smooth' });
                        }
                    });

                    el.addEventListener('scroll', () => {
                        const itemHeight = 50;
                        const scrollTop = el.scrollTop;
                        const selectedIdx = Math.round(scrollTop / itemHeight);
                        Apps.clock[prop] = Math.min(max, Math.max(0, selectedIdx));

                        // Update visual selection
                        const items = el.querySelectorAll('.timer-digit-item[data-val]');
                        items.forEach((item, i) => {
                            if (i === Apps.clock[prop]) {
                                item.classList.add('selected');
                            } else {
                                item.classList.remove('selected');
                            }
                        });

                        Apps.clock.updatePreview();
                    });

                    // Set cursor style
                    el.style.cursor = 'grab';
                },
                scrollToValue: (id, value) => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    el.scrollTop = value * 50;
                },
                updatePreview: () => {
                    const totalSeconds = Apps.clock.selectedHours * 3600 + Apps.clock.selectedMinutes * 60 + Apps.clock.selectedSeconds;
                    const m = Math.floor(totalSeconds / 60);
                    const s = totalSeconds % 60;
                    const display = document.getElementById('stopwatch-val');
                    if (display) {
                        display.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                    }
                },
                start: () => {
                    const totalSeconds = Apps.clock.selectedHours * 3600 + Apps.clock.selectedMinutes * 60 + Apps.clock.selectedSeconds;
                    Timer.time = totalSeconds > 0 ? totalSeconds : 300; // Default 5 min if 0
                    Timer.start();
                }
            },

            calc: {
                val: '',
                history: JSON.parse(localStorage.getItem('calc_history') || '[]'),
                render: () => {
                    document.getElementById('app-body').innerHTML = `
                <div style="display:flex; flex-direction:column; height:100%;">
                    <div style="position:absolute; top:50px; left:20px; z-index:10; font-size:12px; color:#888" onclick="Apps.calc.copy()">Tap result to copy</div>
                     <div style="position:absolute; top:50px; right:20px; z-index:10; font-size:20px; color:#888; cursor:pointer;" onclick="Apps.calc.showHistory()"><i class="fas fa-history"></i></div>
                    
                    <div class="calc-display" id="c-disp" onclick="Apps.calc.copy()">0</div>
                    <div class="calc-grid">
                        <button class="calc-btn cb-lt" onclick="Apps.calc.clr()">AC</button>
                        <button class="calc-btn cb-lt">+/-</button>
                        <button class="calc-btn cb-lt">%</button>
                        <button class="calc-btn cb-or" onclick="Apps.calc.add('/')">÷</button>
                        <button class="calc-btn cb-dk" onclick="Apps.calc.add('7')">7</button>
                        <button class="calc-btn cb-dk" onclick="Apps.calc.add('8')">8</button>
                        <button class="calc-btn cb-dk" onclick="Apps.calc.add('9')">9</button>
                        <button class="calc-btn cb-or" onclick="Apps.calc.add('*')">×</button>
                        <button class="calc-btn cb-dk" onclick="Apps.calc.add('4')">4</button>
                        <button class="calc-btn cb-dk" onclick="Apps.calc.add('5')">5</button>
                        <button class="calc-btn cb-dk" onclick="Apps.calc.add('6')">6</button>
                        <button class="calc-btn cb-or" onclick="Apps.calc.add('-')">-</button>
                        <button class="calc-btn cb-dk" onclick="Apps.calc.add('1')">1</button>
                        <button class="calc-btn cb-dk" onclick="Apps.calc.add('2')">2</button>
                        <button class="calc-btn cb-dk" onclick="Apps.calc.add('3')">3</button>
                        <button class="calc-btn cb-or" onclick="Apps.calc.add('+')">+</button>
                        <button class="calc-btn cb-dk" style="grid-column:span 2; border-radius:24px; aspect-ratio:auto;" onclick="Apps.calc.add('0')">0</button>
                        <button class="calc-btn cb-dk" onclick="Apps.calc.add('.')">.</button>
                        <button class="calc-btn cb-or" onclick="Apps.calc.solve()">=</button>
                    </div>
                </div>`;
                },
                add: (n) => { Apps.calc.val += n; document.getElementById('c-disp').innerText = Apps.calc.val; },
                clr: () => { Apps.calc.val = ''; document.getElementById('c-disp').innerText = '0'; },
                copy: () => {
                    navigator.clipboard.writeText(Apps.calc.val);
                    OS.showPopup('Copied', 'Result copied to clipboard');
                },
                solve: () => {
                    try {
                        const result = eval(Apps.calc.val);
                        // Save history
                        if (Apps.calc.val && result !== undefined) {
                            Apps.calc.history.unshift({ eq: Apps.calc.val, res: result });
                            if (Apps.calc.history.length > 20) Apps.calc.history.pop();
                            localStorage.setItem('calc_history', JSON.stringify(Apps.calc.history));
                        }
                        Apps.calc.val = result;
                        document.getElementById('c-disp').innerText = Apps.calc.val;
                    } catch (e) { document.getElementById('c-disp').innerText = 'Error'; Apps.calc.val = ''; }
                },
                showHistory: () => {
                    const list = Apps.calc.history.map(h => `<div style="padding:10px; border-bottom:1px solid #333; display:flex; justify-content:space-between; color:white;"><span style="opacity:0.6">${h.eq} =</span> <span style="font-weight:bold">${h.res}</span></div>`).join('');
                    OS.showPopup('History', `<div style="max-height:300px; overflow-y:auto; text-align:left;">${list || '<div style="text-align:center;color:#888">No history</div>'}</div>`);
                }
            },

            settings: {
                view: 'root', tempPin: '',
                render: (v) => {
                    if (v) Apps.settings.view = v;
                    const view = Apps.settings.view;
                    const body = document.getElementById('app-body');
                    const headerTitle = document.getElementById('app-title');
                    const backBtn = document.getElementById('app-back');
                    document.getElementById('app-header').style.display = 'flex'; // Ensure header is visible

                    if (view === 'root') { headerTitle.innerText = ''; backBtn.style.display = 'none'; }
                    else { backBtn.style.display = 'block'; backBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Settings'; backBtn.onclick = () => Apps.settings.render('root'); }

                    let content = '';

                    if (view === 'root') {
                        content = `
                    <div class="anim-fade">
                        <div class="settings-profile-header" onclick="Apps.settings.render('profile')">
                            <div class="profile-avatar">
                                ${State.userProfile.image ?
                                `<img src="${State.userProfile.image}">` :
                                `<i class="fas fa-user"></i>`}
                            </div>
                            <div class="profile-info">
                                <div class="profile-greeting">Welcome, ${State.userProfile.name}</div>
                                <div class="profile-subtitle">Tap to edit profile</div>
                            </div>
                            <i class="fas fa-chevron-right" style="color:#ccc; font-size:14px"></i>
                        </div>
                        
                        <div style="padding: 0 20px 5px; font-size:13px; color:var(--text-sec);">CUSTOMIZATION</div>
                        <div class="list-group" style="margin: 0 20px 20px;">
                            <div class="list-item" onclick="Apps.settings.render('wallpaper')">
                                <div style="display:flex; align-items:center;"><div class="s-icon" style="background:#5856d6"><i class="fas fa-paint-brush"></i></div><span>Wallpaper</span></div><i class="fas fa-chevron-right" style="color:#ccc; font-size:14px"></i>
                            </div>
                             <div class="list-item" onclick="Apps.settings.render('island')">
                                <div style="display:flex; align-items:center;"><div class="s-icon" style="background:#000"><i class="fas fa-minus"></i></div><span>Dynamic Island</span></div><i class="fas fa-chevron-right" style="color:#ccc; font-size:14px"></i>
                            </div>
                             <div class="list-item" onclick="Apps.settings.render('aod')">
                                <div style="display:flex; align-items:center;"><div class="s-icon" style="background:#ff3b30"><i class="fas fa-clock"></i></div><span>Always On Display</span></div><i class="fas fa-chevron-right" style="color:#ccc; font-size:14px"></i>
                            </div>
                             <div class="list-item" onclick="Apps.settings.render('animations')">
                                <div style="display:flex; align-items:center;"><div class="s-icon" style="background:#ff9500"><i class="fas fa-bolt"></i></div><span>Animations</span></div><i class="fas fa-chevron-right" style="color:#ccc; font-size:14px"></i>
                            </div>
                        </div>

                        <div style="padding: 0 20px 5px; font-size:13px; color:var(--text-sec);">SECURITY</div>
                        <div class="list-group" style="margin: 0 20px 20px;">
                             <div class="list-item" onclick="Apps.settings.render('security')">
                                <div style="display:flex; align-items:center;"><div class="s-icon" style="background:#34c759"><i class="fas fa-lock"></i></div><span>PIN and Fingerprint</span></div><i class="fas fa-chevron-right" style="color:#ccc; font-size:14px"></i>
                            </div>
                        </div>

                        <div style="padding: 0 20px 5px; font-size:13px; color:var(--text-sec);">DISPLAY</div>
                        <div class="list-group" style="margin: 0 20px 20px;">
                            <div class="list-item" onclick="Apps.settings.render('display')">
                                <div style="display:flex; align-items:center;"><div class="s-icon" style="background:#007aff"><i class="fas fa-sun"></i></div><span>Display & Brightness</span></div><i class="fas fa-chevron-right" style="color:#ccc; font-size:14px"></i>
                            </div>
                        </div>

                        <div style="padding: 0 20px 5px; font-size:13px; color:var(--text-sec);">INFORMATION</div>
                        <div class="list-group" style="margin: 0 20px 20px;">
                            <div class="list-item" onclick="Apps.settings.render('about')">
                                <div style="display:flex; align-items:center;"><div class="s-icon" style="background:#8e8e93"><i class="fas fa-info"></i></div><span>About</span></div><i class="fas fa-chevron-right" style="color:#ccc; font-size:14px"></i>
                            </div>
                        </div>
                    </div>`;
                    }
                    else if (view === 'aod') {
                        headerTitle.innerText = 'Always On Display';
                        content = `
                    <div class="anim-fade">
                        <div style="height:150px; background:#000; margin:0 20px 20px; border-radius:15px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#ccc; border:1px solid #333; position:relative; overflow:hidden;">
                            ${State.aod.wallpaper ? `<div style="position:absolute; inset:0; background:var(--wall); background-size:cover; opacity:0.5; filter:brightness(0.5);"></div>` : ''}
                            <div style="z-index:2; text-align:center;">
                                <div style="font-size:12px; font-weight:600; opacity:0.7">SATURDAY, JAN 1</div>
                                <div style="font-size:40px; font-weight:200; line-height:1; font-family:${State.aod.style == 'serif' ? "'Times New Roman', serif" : State.aod.style == 'science' ? "'Rajdhani', sans-serif" : State.aod.style == 'mono' ? "'Monoton', cursive" : State.aod.style == 'lux' ? "'Luxurious Roman', serif" : "'Inter', sans-serif"}">12:00</div>
                                <div id="aod-preview-text" style="font-size:10px; margin-top:5px; opacity:0.8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${State.aod.text || "Your Text"}</div>
                            </div>
                        </div>

                        <div class="list-group">
                             <div class="list-item" onclick="Apps.settings.toggleAOD()"><span>Always On Display</span><div class="toggle ${State.aod.enabled ? 'active' : ''}"></div></div>
                        </div>
                        <div style="padding:0 20px 5px; font-size:13px; color:var(--text-sec);">TEXT</div>
                        <div style="margin:0 20px 20px;">
                            <input type="text" value="${State.aod.text}" placeholder="Enter custom text..." onkeydown="event.stopPropagation()" oninput="Apps.settings.updateAODTextPreview(this.value)" style="width:100%; padding:12px; border-radius:10px; border:none; background:rgba(128,128,128,0.1); color:var(--text-main); font-size:16px;">
                        </div>
                        <div style="padding:0 20px 5px; font-size:13px; color:var(--text-sec);">CLOCK FONT</div>
                        <div class="list-group">
                             <div class="list-item" onclick="Apps.settings.setAODStyle('default')"><span>Inter (Default)</span>${State.aod.style == 'default' ? '<i class="fas fa-check"></i>' : ''}</div>
                             <div class="list-item" onclick="Apps.settings.setAODStyle('serif')"><span style="font-family:'Times New Roman', serif">Serif</span>${State.aod.style == 'serif' ? '<i class="fas fa-check"></i>' : ''}</div>
                             <div class="list-item" onclick="Apps.settings.setAODStyle('science')"><span style="font-family:'Rajdhani', sans-serif">Science Gothic</span>${State.aod.style == 'science' ? '<i class="fas fa-check"></i>' : ''}</div>
                             <div class="list-item" onclick="Apps.settings.setAODStyle('mono')"><span style="font-family:'Monoton', cursive">Monoton</span>${State.aod.style == 'mono' ? '<i class="fas fa-check"></i>' : ''}</div>
                             <div class="list-item" onclick="Apps.settings.setAODStyle('lux')"><span style="font-family:'Luxurious Roman', serif">Luxurious Roman</span>${State.aod.style == 'lux' ? '<i class="fas fa-check"></i>' : ''}</div>
                        </div>
                        <div style="padding:0 20px 5px; font-size:13px; color:var(--text-sec);">BACKGROUND</div>
                        <div class="list-group">
                             <div class="list-item" onclick="Apps.settings.toggleAODWall()"><span>Show Wallpaper</span><div class="toggle ${State.aod.wallpaper ? 'active' : ''}"></div></div>
                             <div class="list-item" onclick="document.getElementById('aod-input').click()"><span>Custom Image</span><i class="fas fa-image"></i></div>
                             <div class="list-item" onclick="Apps.settings.setAODImg(null)"><span>No Image</span>${State.aod.image == null ? '<i class="fas fa-check"></i>' : ''}</div>
                        </div>
                    </div>`;
                        document.getElementById('aod-input').onchange = (e) => { const f = e.target.files[0]; if (f) Apps.settings.setAODImg(URL.createObjectURL(f)); };
                    }
                    else if (view === 'security') {
                        headerTitle.innerText = 'PIN and Fingerprint';
                        content = `
                    <div class="anim-fade">
                        <div class="list-group">
                            <div class="list-item" onclick="Apps.settings.render('pin')"><span>${State.security.pin ? 'Change PIN' : 'Set PIN'}</span><span style="color:var(--text-sec); margin-right:10px">${State.security.pin ? 'On' : 'Off'}</span></div>
                            <div class="list-item" onclick="${State.security.pin ? "Apps.settings.render('bio')" : "OS.showPopup('Security','Set a PIN first.')"}"><span style="${!State.security.pin ? 'opacity:0.5' : ''}">Fingerprint</span><span style="color:var(--text-sec); margin-right:10px">${State.security.fingerprint ? 'Enrolled' : 'Off'}</span></div>
                        </div>
                        ${State.security.fingerprint ? `
                        <div class="list-group" style="margin: 0 20px 10px;">
                            <div class="list-item" onclick="Apps.settings.toggleSlowFingerprint()"><span>Slow Animation</span><div class="toggle ${State.security.slowFingerprint ? 'active' : ''}"></div></div>
                        </div>
                        <div style="padding:0 20px 5px; font-size:13px; color:var(--text-sec);">ICON STYLE</div>
                        <div class="fp-grid">
                            <div class="fp-opt ${State.security.bioIcon == 'default' ? 'selected' : ''}" onclick="Apps.settings.setBioIcon('default')"><i class="fas fa-fingerprint" style="font-size:24px;color:white"></i></div>
                            <div class="fp-opt ${State.security.bioIcon == 'bio-grad' ? 'selected' : ''}" onclick="Apps.settings.setBioIcon('bio-grad')"><div style="width:24px;height:24px;background:linear-gradient(to top, #8000ff, #000);border-radius:50%"></div></div>
                            <div class="fp-opt ${State.security.bioIcon == 'bio-aura' ? 'selected' : ''}" onclick="Apps.settings.setBioIcon('bio-aura')"><div style="width:24px;height:24px;border:2px solid transparent;border-top-color:#00ffcc;border-right-color:#007aff;border-radius:50%"></div></div>
                            <div class="fp-opt ${State.security.bioIcon == 'abstract' ? 'selected' : ''}" onclick="Apps.settings.setBioIcon('abstract')"><div style="width:24px;height:24px;background:linear-gradient(45deg,#ff00cc,transparent);border-radius:50%"></div></div>
                            <div class="fp-opt ${State.security.bioIcon == 'mk' ? 'selected' : ''}" onclick="Apps.settings.setBioIcon('mk')"><i class="fas fa-dragon" style="font-size:24px;color:gold"></i></div>
                            <div class="fp-opt ${State.security.bioIcon == 'orb' ? 'selected' : ''}" onclick="Apps.settings.setBioIcon('orb')"><div style="width:6px;height:6px;background:cyan;border-radius:50%;box-shadow:0 0 5px cyan"></div></div>
                            <div class="fp-opt ${State.security.bioIcon == 'bio-swirl' ? 'selected' : ''}" onclick="Apps.settings.setBioIcon('bio-swirl')"><div style="width:24px;height:24px;border-radius:50%;border:2px solid cyan;opacity:0.5"></div></div>
                            <div class="fp-opt ${State.security.bioIcon == 'bio-pulse' ? 'selected' : ''}" onclick="Apps.settings.setBioIcon('bio-pulse')"><div style="width:24px;height:24px;border:2px solid #00ff88;border-radius:50%;box-shadow:0 0 8px #00ff88"></div></div>
                            <div class="fp-opt ${State.security.bioIcon == 'bio-hex' ? 'selected' : ''}" onclick="Apps.settings.setBioIcon('bio-hex')"><div style="width:24px;height:24px;background:linear-gradient(135deg,#8a2be2,#4b0082);border-radius:50%;box-shadow:0 0 8px #8a2be2"></div></div>
                            <div class="fp-opt ${State.security.bioIcon == 'bio-ripple' ? 'selected' : ''}" onclick="Apps.settings.setBioIcon('bio-ripple')"><div style="width:24px;height:24px;border:2px solid #ffa500;border-radius:50%;box-shadow:0 0 8px #ffa500"></div></div>
                            <div class="fp-opt ${State.security.bioIcon == 'bio-circuit' ? 'selected' : ''}" onclick="Apps.settings.setBioIcon('bio-circuit')"><div style="width:24px;height:24px;border:1px solid #00ffff;border-radius:50%;background:rgba(0,255,255,0.2);box-shadow:0 0 8px #00ffff"></div></div>
                            <div class="fp-opt ${State.security.bioIcon == 'bio-dna' ? 'selected' : ''}" onclick="Apps.settings.setBioIcon('bio-dna')"><div style="width:24px;height:24px;border:2px solid #ff0080;border-radius:50%;box-shadow:0 0 8px #ff0080"></div></div>
                            <div class="fp-opt ${State.security.bioIcon == 'bio-scan' ? 'selected' : ''}" onclick="Apps.settings.setBioIcon('bio-scan')"><div style="width:24px;height:24px;border:2px solid #32cd32;border-radius:50%;box-shadow:0 0 8px #32cd32"></div></div>
                            <div class="fp-opt ${State.security.bioIcon == 'bio-matrix' ? 'selected' : ''}" onclick="Apps.settings.setBioIcon('bio-matrix')"><div style="width:24px;height:24px;border:1px solid #0096ff;border-radius:50%;background:rgba(0,150,255,0.2);box-shadow:0 0 8px #0096ff"></div></div>
                        </div>` : ''}
                    </div>`;
                    }
                    else if (view === 'pin') {
                        headerTitle.innerText = 'Set PIN';
                        Apps.settings.tempPin = '';
                        content = `
                    <div class="anim-fade" style="text-align:center; padding-top:40px;">
                         <div style="margin-bottom:20px; font-size:18px;">Enter new 4-digit PIN</div>
                         <div id="set-pin-disp" style="font-size:30px; letter-spacing:10px; margin-bottom:40px; font-weight:bold; min-height:40px;">_ _ _ _</div>
                         <div class="phone-grid">
                            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `<button class="num-btn" style="width:60px; height:60px;" onclick="Apps.settings.handlePinIn('${n}')"><div class="nb-big">${n}</div></button>`).join('')}
                         </div>
                         <button class="btn-pill" style="width:200px; background:#ff3b30;" onclick="Apps.settings.render('security')">Cancel</button>
                    </div>`;
                    }
                    else if (view === 'bio') {
                        headerTitle.innerText = 'Enrollment';
                        content = `
                    <div class="enroll-overlay">
                        <h2>Fingerprint</h2>
                        <p style="color:#888; max-width:280px; margin-bottom:20px;">Place your finger on the sensor below and hold until the circle fills completely.</p>
                        
                        <div class="enroll-circle" id="enroll-btn">
                            <div class="enroll-fill" id="enroll-fill"></div>
                            <i class="fas fa-fingerprint" style="position:relative; z-index:2"></i>
                        </div>
                        
                        <div id="enroll-status" style="height:20px; color:var(--accent); font-weight:600;"></div>
                        <button class="btn-pill" style="margin-top:40px; background:#333;" onclick="Apps.settings.render('security')">Cancel</button>
                    </div>
                `;
                        setTimeout(() => {
                            const btn = document.getElementById('enroll-btn');
                            const fill = document.getElementById('enroll-fill');
                            const stat = document.getElementById('enroll-status');
                            let progress = 0;
                            let timer = null;

                            const start = (e) => {
                                e.preventDefault();
                                btn.classList.add('active');
                                stat.innerText = "Scanning...";
                                timer = setInterval(() => {
                                    progress += 2;
                                    fill.style.height = progress + '%';
                                    if (progress >= 100) {
                                        clearInterval(timer);
                                        State.security.fingerprint = true;
                                        stat.innerText = "Success!";
                                        stat.style.color = "#34c759";
                                        btn.style.borderColor = "#34c759";
                                        btn.style.color = "#34c759";
                                        Storage.saveSettings();
                                        setTimeout(() => Apps.settings.render('security'), 1000);
                                    }
                                }, 20);
                            };
                            const end = (e) => {
                                e.preventDefault();
                                clearInterval(timer);
                                btn.classList.remove('active');
                                if (progress < 100) {
                                    progress = 0;
                                    fill.style.height = '0%';
                                    stat.innerText = "Hold longer";
                                }
                            };
                            btn.addEventListener('mousedown', start);
                            btn.addEventListener('mouseup', end);
                            btn.addEventListener('mouseleave', end);
                            btn.addEventListener('touchstart', start);
                            btn.addEventListener('touchend', end);
                        }, 50);
                    }
                    else if (view === 'display') {
                        headerTitle.innerText = 'Display';
                        content = `<div class="anim-fade"><div class="list-group"><div class="list-item" onclick="Apps.settings.toggleDark()"><span>Dark Mode</span><div class="toggle ${State.darkMode ? 'active' : ''}"></div></div><div class="list-item" onclick="Apps.settings.toggleGlass()"><span>Transparency Effects</span><div class="toggle ${State.glassUI ? 'active' : ''}"></div></div><div class="list-item" style="display:block; cursor:default"><div style="margin-bottom:10px; font-size:14px;">Brightness</div><input type="range" min="20" max="100" value="${State.brightness}" oninput="Apps.settings.setBright(this.value)"></div><div class="list-item" onclick="Apps.settings.toggleTap()"><span>Visual Taps</span><div class="toggle ${State.tapIndicators ? 'active' : ''}"></div></div></div></div>`;
                    }

                    else if (view === 'wallpaper') {
                        headerTitle.innerText = 'Wallpapers';

                        const currentWallUrl = State.wallpapers[State.currentWall] || '';

                        let gridItems = '';
                        State.wallpapers.forEach((url, i) => {
                            gridItems += `
                                 <div class="wall-grid-item ${i === State.currentWall ? 'active' : ''}" onclick="Apps.settings.setWall(${i})" style="min-width: 60px; height: 100px; border-radius: 10px; overflow: hidden; border: 2px solid ${i === State.currentWall ? 'var(--accent)' : 'transparent'}; cursor: pointer;">
                                     <div style="background-image:url('${url}'); width:100%; height:100%; background-size:cover;"></div>
                                 </div>
                             `;
                        });

                        // Add "Add New" button to grid
                        gridItems += `
                             <div class="wall-grid-item" onclick="document.getElementById('wall-input').click()" style="min-width: 60px; height: 100px; border-radius: 10px; overflow: hidden; border: 2px dashed #444; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                                 <i class="fas fa-plus" style="color:var(--text-sec); font-size: 20px;"></i>
                             </div>
                        `;

                        content = `
                        <div class="anim-fade" style="padding:20px; height:100%; display:flex; flex-direction:column; box-sizing:border-box;">
                             <div style="flex:1; background-image:url('${currentWallUrl}'); background-size:cover; background-position:center; border-radius:16px; margin-bottom:20px; box-shadow:0 4px 12px rgba(0,0,0,0.3); transition: background-image 0.3s ease;"></div>
                             
                             <div style="margin-bottom:20px; display:flex; gap:10px; overflow-x:auto; padding-bottom:5px;">
                                 ${gridItems}
                             </div>
                             
                             <div class="list-group" style="margin:0;">
                                <div class="list-item" onclick="Apps.settings.toggleLsBlur()">
                                    <span>Lock Screen Blur</span>
                                    <div class="toggle ${State.lsBlur ? 'active' : ''}"></div>
                                </div>
                             </div>
                        </div>`;
                    }
                    else if (view === 'animations') {
                        headerTitle.innerText = 'Animations';
                        const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5];
                        let speedItems = speeds.map(s => `
                            <div class="list-item" onclick="Apps.settings.setAnimSpeed(${s})">
                                <span>${s}x${s === 1.5 ? ' (Default)' : s >= 3 ? ' (Slow)' : s <= 0.75 ? ' (Fast)' : ''}</span>
                                ${State.animationSpeed === s ? '<i class="fas fa-check"></i>' : ''}
                            </div>
                        `).join('');
                        content = `<div class="anim-fade">
                            <div style="padding:0 20px 5px; font-size:13px; color:var(--text-sec);">ANIMATION STYLE</div>
                            <div class="list-group">
                                <div class="list-item" onclick="Apps.settings.toggleCircleOpener()">
                                    <span>Circle App Opener</span>
                                    <div class="toggle ${State.circleOpener ? 'active' : ''}"></div>
                                </div>
                            </div>
                            <div style="padding:0 20px 20px; color:var(--text-sec); font-size:12px;">
                                Makes the app box circular when opening
                            </div>

                            <div style="padding:0 20px 5px; font-size:13px; color:var(--text-sec);">ANIMATION SPEED</div>
                            <div style="padding:0 20px 20px; color:var(--text-sec); font-size:12px;">
                                Higher values produce slower animations
                            </div>
                            <div class="list-group">${speedItems}</div>
                        </div>`;
                    }
                    else if (view === 'profile') {
                        headerTitle.innerText = 'Profile';
                        content = `<div class="anim-fade">
                            <div class="setup-profile-container" style="margin-top:20px;">
                                <div class="setup-profile-icon" onclick="document.getElementById('profile-input').click()">
                                    ${State.userProfile.image ?
                                `<img src="${State.userProfile.image}">` :
                                `<i class="fas fa-user"></i>`}
                                    <div class="setup-profile-edit"><i class="fas fa-camera"></i></div>
                                </div>
                            </div>
                            <div style="padding:0 20px 5px; font-size:13px; color:var(--text-sec);">NAME</div>
                            <div style="margin:0 20px 20px;">
                                <input type="text" value="${State.userProfile.name}" placeholder="Enter your name" 
                                    onkeydown="event.stopPropagation()" 
                                    onchange="Apps.settings.updateProfile(this.value, null)"
                                    style="width:100%; padding:12px; border-radius:10px; border:none; background:rgba(128,128,128,0.1); color:var(--text-main); font-size:16px;">
                            </div>
                            <div style="padding:0 20px; color:var(--text-sec); font-size:12px; text-align:center;">
                                Tap the icon to change profile picture
                            </div>
                        </div>`;
                        // Re-use handleProfileImage logic but routed through settings update
                        document.getElementById('profile-input').onchange = (e) => {
                            const file = e.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                    Apps.settings.updateProfile(State.userProfile.name, evt.target.result);
                                };
                                reader.readAsDataURL(file);
                            }
                        };
                    }
                    else if (view === 'island') {
                        headerTitle.innerText = 'Dynamic Island';
                        content = `<div class="anim-fade"><div class="list-group"><div class="list-item" onclick="Apps.settings.togglePunch()"><span>Punch Hole Style</span><div class="toggle ${State.punchHole ? 'active' : ''}"></div></div><div class="list-item" onclick="Apps.settings.toggleMusicGrad()"><span>Music Gradient</span><div class="toggle ${State.musicGradient ? 'active' : ''}"></div></div></div><div class="list-group"><div class="list-header">Mode</div><div class="list-item" onclick="Apps.settings.setIsland('clock')"><span>Clock</span>${State.islandMode == 'clock' ? '<i class="fas fa-check"></i>' : ''}</div><div class="list-item" onclick="Apps.settings.setIsland('waves')"><span>Animated Waves</span>${State.islandMode == 'waves' ? '<i class="fas fa-check"></i>' : ''}</div><div class="list-item" onclick="Apps.settings.setIsland('text')"><span>Text</span>${State.islandMode == 'text' ? '<i class="fas fa-check"></i>' : ''}</div></div><div class="list-group"><div class="list-header">Color</div><div class="list-item" onclick="Apps.settings.setColor('#000')"><div style="display:flex;align-items:center;gap:10px;"><div style="width:20px;height:20px;background:#000;border-radius:50%"></div>Black</div></div><div class="list-item" onclick="Apps.settings.setColor('#007aff')"><div style="display:flex;align-items:center;gap:10px;"><div style="width:20px;height:20px;background:#007aff;border-radius:50%"></div>Blue</div></div><div class="list-item" onclick="Apps.settings.setColor('#ff3b30')"><div style="display:flex;align-items:center;gap:10px;"><div style="width:20px;height:20px;background:#ff3b30;border-radius:50%"></div>Red</div></div><div class="list-item" onclick="Apps.settings.setColor('#800080')"><div style="display:flex;align-items:center;gap:10px;"><div style="width:20px;height:20px;background:#800080;border-radius:50%"></div>Purple</div></div></div></div>`;
                    }
                    else if (view === 'about') {
                        headerTitle.innerText = 'About';
                        const auraClass = State.darkMode ? 'aura-dark' : 'aura-light';
                        content = `<div class="anim-fade" style="padding-top:0px; position:relative; min-height:100%;">
                            <div class="aura-container ${auraClass}" style="position:fixed; top:0; left:0; width:100%; height:60%; z-index:0;">
                                <div class="aura-circle ac-1"></div>
                                <div class="aura-circle ac-2"></div>
                                <div class="aura-circle ac-3"></div>
                                <div class="aura-circle ac-4"></div>
                            </div>
                            <div class="about-hero" style="z-index:2; position:relative;">
                                <div class="realos-text">RealOS</div>
                                <div class="realos-ver">V2.0.0</div>
                            </div>
                            <div style="padding:0 20px 40px; position:relative; z-index:2;">
                                <div style="text-align:center; color:var(--text-sec); margin-top:5px; margin-bottom:30px;">@rrealomarr</div>
                                <div class="list-group" style="margin: 0; backdrop-filter:blur(20px); background:rgba(var(--bg-card-rgb), 0.3);">
                                    <div class="list-item" style="cursor:default;"><span>Name</span><span style="color:var(--text-sec)">RealPhone 1</span></div>
                                    <div class="list-item" style="cursor:default;"><span>Model</span><span style="color:var(--text-sec)">RP-G1</span></div>
                                    <div class="list-item" style="cursor:default;"><span>Chipset</span><span style="color:var(--text-sec)">RealCPU Gen 1</span></div>
                                    <div class="list-item" style="cursor:default;"><span>Battery</span><span style="color:var(--text-sec)">6000 mAh</span></div>
                                </div>
                            </div>
                        </div>`;
                    }

                    body.innerHTML = content;
                },
                handlePinIn: (n) => {
                    if (Apps.settings.tempPin.length < 4) {
                        Apps.settings.tempPin += n;
                        document.getElementById('set-pin-disp').innerText = Apps.settings.tempPin.padEnd(4, '_').split('').join(' ');
                        if (Apps.settings.tempPin.length === 4) {
                            State.security.pin = Apps.settings.tempPin;
                            Storage.saveSettings();

                            // Check if in setup mode
                            const setupActive = document.getElementById('setup-screen').classList.contains('active');
                            if (setupActive) {
                                Setup.next('security', 'finish');
                                // Hide the app window used for setup
                                document.getElementById('app-window').style.display = 'none';
                                document.getElementById('app-window').style.zIndex = '';
                            } else {
                                setTimeout(() => Apps.settings.render('security'), 300);
                            }
                        }
                    }
                },
                toggleDark: () => { State.darkMode = !State.darkMode; OS.applySettings(); Apps.settings.render('display'); },
                toggleTap: () => { State.tapIndicators = !State.tapIndicators; OS.applySettings(); Apps.settings.render('display'); },
                toggleGlass: () => { State.glassUI = !State.glassUI; OS.applySettings(); Apps.settings.render('display'); },
                setBright: (v) => { State.brightness = v; OS.applySettings(); },
                setIsland: (m) => { State.islandMode = m; OS.applySettings(); Apps.settings.render('island'); },
                setColor: (c) => { State.islandColor = c; OS.applySettings(); Apps.settings.render('island'); },
                setWall: (i) => { State.currentWall = i; document.documentElement.style.setProperty('--wall', `url(${State.wallpapers[i]})`); Storage.saveSettings(); Apps.settings.render('wallpaper'); },
                toggleAOD: () => { State.aod.enabled = !State.aod.enabled; Storage.saveSettings(); Apps.settings.render('aod'); },
                toggleAODWall: () => { State.aod.wallpaper = !State.aod.wallpaper; Storage.saveSettings(); Apps.settings.render('aod'); },
                togglePunch: () => { State.punchHole = !State.punchHole; OS.applySettings(); Apps.settings.render('island'); },
                toggleMusicGrad: () => { State.musicGradient = !State.musicGradient; Storage.saveSettings(); Apps.settings.render('island'); Island.update(); },
                toggleSlowFingerprint: () => { State.security.slowFingerprint = !State.security.slowFingerprint; Storage.saveSettings(); Apps.settings.render('security'); },
                setAODStyle: (s) => { State.aod.style = s; Storage.saveSettings(); Apps.settings.render('aod'); },
                updateAODTextPreview: (t) => { State.aod.text = t; Storage.saveSettings(); document.getElementById('aod-preview-text').innerText = t || "Your Text"; },
                setAODText: (t) => { State.aod.text = t; Storage.saveSettings(); Apps.settings.render('aod'); },
                setAODImg: (src) => { State.aod.image = src; OS.applySettings(); Apps.settings.render('aod'); },
                setBioIcon: (i) => { State.security.bioIcon = i; Storage.saveSettings(); Apps.settings.render('security'); LockScreen.updateUI(); },
                toggleLsBlur: () => { State.lsBlur = !State.lsBlur; OS.applySettings(); Apps.settings.render('wallpaper'); },
                setAnimSpeed: (speed) => {
                    State.animationSpeed = speed;
                    document.documentElement.style.setProperty('--home-anim-dur', `${0.5 * speed}s`);
                    Storage.saveSettings();
                    Apps.settings.render('animations');
                },
                toggleCircleOpener: () => {
                    State.circleOpener = !State.circleOpener;
                    Storage.saveSettings();
                    Apps.settings.render('animations');
                },
                updateProfile: (name, image) => {
                    State.userProfile.name = name || 'Guest';
                    if (image) State.userProfile.image = image;
                    Storage.saveSettings();
                    Apps.settings.render('profile');
                },
                openSection: (sec) => {
                    // Helper to open settings from features app
                    AppManager.close();
                    State.returnToFeatures = true; // Set flag
                    State.nextApp = 'settings';

                    setTimeout(() => {
                        AppManager.open('settings');
                        setTimeout(() => Apps.settings.render(sec), 300);
                    }, 600);
                }
            },

            features: {
                render: () => {
                    if (localStorage.getItem('realos_features_shown')) {  }
                    document.getElementById('app-body').innerHTML = `
                        <div style="padding:20px; text-align:center;">
                            <h1>Welcome to RealOS</h1>
                            <p style="color:#888; margin-bottom:30px">Explore the features of your new OS.</p>
                            
                            <div class="list-group" style="text-align:left;">
                                <div class="list-header">Personalization</div>
                                <div class="list-item" onclick="Apps.settings.openSection('wallpaper')">
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <div style="width:30px;height:30px;background:#007aff;border-radius:6px;display:flex;align-items:center;justify-content:center;color:white"><i class="fas fa-palette"></i></div>
                                        <div>Themes & Wallpapers</div>
                                    </div>
                                    <i class="fas fa-chevron-right" style="opacity:0.3"></i>
                                </div>
                                <div class="list-item" onclick="Apps.settings.openSection('security')">
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <div style="width:30px;height:30px;background:#34c759;border-radius:6px;display:flex;align-items:center;justify-content:center;color:white"><i class="fas fa-fingerprint"></i></div>
                                        <div>Fingerprint icons</div>
                                    </div>
                                    <i class="fas fa-chevron-right" style="opacity:0.3"></i>
                                </div>
                            </div>

                            <div class="list-group" style="text-align:left;">
                                <div class="list-header">System</div>
                                <div class="list-item" onclick="Apps.settings.openSection('island')">
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <div style="width:30px;height:30px;background:#000;border-radius:6px;display:flex;align-items:center;justify-content:center;color:white"><i class="fas fa-minus"></i></div>
                                        <div>Dynamic Island</div>
                                    </div>
                                    <i class="fas fa-chevron-right" style="opacity:0.3"></i>
                                </div>
                                <div class="list-item" onclick="Apps.settings.openSection('aod')">
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <div style="width:30px;height:30px;background:#ff9f0a;border-radius:6px;display:flex;align-items:center;justify-content:center;color:white"><i class="fas fa-clock"></i></div>
                                        <div>Advanced AOD</div>
                                    </div>
                                    <i class="fas fa-chevron-right" style="opacity:0.3"></i>
                                </div>
                            </div>

                            <button class="btn-pill" onclick="State.returnToFeatures=false; AppManager.close()">Don't show again</button>
                        </div>
                    `;
                }
            },

            music: {
                render: () => {
                    const body = document.getElementById('app-body');
                    document.getElementById('app-header').style.display = 'none';

                    let listHTML = '';
                    Music.library.forEach((track, i) => {
                        const artStyle = track.art ? `background-image:url('${track.art}')` : `background:linear-gradient(45deg, #333, #666)`;
                        const isPlaying = Music.currentIdx === i && Music.active;
                        listHTML += `
                    <div class="song-item" data-song-idx="${i}" onclick="Music.playTrack(${i})">
                        <div class="song-art" style="${artStyle}"></div>
                        <div class="song-info">
                            <div class="song-title">${track.title}</div>
                            <div class="song-artist">${track.artist}</div>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px">
                            <span class="song-playing-indicator ${isPlaying ? 'active' : ''}"><i class="fas fa-volume-up" style="color:var(--accent)"></i></span>
                            <div style="padding:10px; color:#666; cursor:pointer;" onclick="event.stopPropagation(); Music.removeTrack(${i})"><i class="fas fa-times"></i></div>
                        </div>
                    </div>
                `;
                    });

                    const current = Music.library[Music.currentIdx] || { title: 'No Song', artist: '-', art: null };
                    const curArt = current.art ? `background-image:url('${current.art}')` : `background:linear-gradient(45deg, #333, #666)`;
                    const blurArt = current.art ? `background-image:url('${current.art}')` : `background:#333`;

                    body.innerHTML = `
                <div class="music-app">
                    <div class="music-header">
                        <button class="add-song-btn" onclick="document.getElementById('file-input').click()"><i class="fas fa-plus"></i></button>
                        <h2 style="margin:0">Music</h2>
                    </div>
                    <div class="song-list">
                        ${Music.library.length ? listHTML : '<div style="padding:20px; color:#666; text-align:center;">No songs added. Tap + to add MP3.</div>'}
                    </div>
                    
                    <div class="mini-player" onclick="Music.expand()">
                        <div class="mini-player-bg" style="${blurArt}; background-size:cover; filter: blur(30px); opacity: 0.6;"></div>
                        <div class="mini-player-content">
                            <div id="mp-art" style="width:50px; height:50px; border-radius:8px; flex-shrink:0; margin-right:15px; ${curArt}; background-size:cover;"></div>
                            <div style="flex:1; overflow:hidden;">
                                <div id="mp-title" style="font-weight:600; white-space:nowrap;">${current.title}</div>
                                <div id="mp-artist" style="font-size:12px; color:#aaa;">${current.artist}</div>
                                <!-- Progress in Pill -->
                                <div class="prog-bar-container" style="height:4px; margin-top:5px; cursor:default;" onclick="event.stopPropagation()">
                                    <div class="prog-bar-bg" style="background:rgba(255,255,255,0.2)"><div class="prog-bar-fill" id="app-prog-fill"></div></div>
                                </div>
                            </div>
                            <div style="font-size:24px; margin-left:15px;">
                                <i id="mp-play-icon" class="fas ${Music.audio.paused ? 'fa-play' : 'fa-pause'}" onclick="event.stopPropagation(); Music.toggle()"></i>
                            </div>
                        </div>
                    </div>
                </div>
            `;
                    document.getElementById('file-input').onchange = Music.handleFile;
                }
            }
        };

        
        
        const Volume = {
            timer: null,
            silent: false,
            level: 50,
            isDragging: false,

            init: () => {
                const bar = document.getElementById('volume-bar');
                if (!bar) return;
                // Drag Events
                bar.addEventListener('pointerdown', Volume.startDrag);
                window.addEventListener('pointermove', Volume.handleDrag);
                window.addEventListener('pointerup', Volume.endDrag);

                Volume.setLevel(50);
            },

            show: () => {
                const overlay = document.getElementById('volume-overlay');
                overlay.classList.add('active');

                if (Volume.timer) clearTimeout(Volume.timer);
                Volume.timer = setTimeout(Volume.hide, 3000);
            },

            hide: () => {
                if (Volume.isDragging) return;
                document.getElementById('volume-overlay').classList.remove('active');
            },

            handlePress: (type) => {
                Volume.show();
                let change = 10;
                if (type === 'down') change = -10;
                Volume.setLevel(Volume.level + change);

                // Haptic visual
                const btn = type === 'up' ? document.getElementById('vol-up') : document.getElementById('vol-down');
                if (btn) {
                    btn.style.transform = 'scale(0.9)';
                    setTimeout(() => btn.style.transform = 'scale(1)', 100);
                }
            },

            setLevel: (val) => {
                // Clamp
                if (val < 0) val = 0;
                if (val > 100) val = 100;
                Volume.level = val;

                // Update CSS
                const fill = document.querySelector('.vol-fill');
                const icon = document.getElementById('vol-icon');
                if (!fill || !icon) return;

                fill.style.height = `${val}%`;

                // Update Icon State
                if (val <= 1) icon.className = 'fas fa-volume-mute vol-icon';
                else if (val < 50) icon.className = 'fas fa-volume-down vol-icon';
                else icon.className = 'fas fa-volume-up vol-icon';

                // Contrast Logic
                if (val > 12) icon.classList.add('dark');
                else icon.classList.remove('dark');
            },

            startDrag: (e) => {
                Volume.isDragging = true;
                Volume.show(); // Keep open
                Volume.handleDrag(e);
                document.getElementById('volume-bar').classList.add('pulse');
                if (Volume.timer) clearTimeout(Volume.timer);
            },

            handleDrag: (e) => {
                if (!Volume.isDragging) return;
                e.preventDefault();
                const bar = document.getElementById('volume-bar');
                const rect = bar.getBoundingClientRect();

                let dist = rect.bottom - e.clientY;
                let pct = (dist / rect.height) * 100;

                Volume.setLevel(pct);
            },

            endDrag: () => {
                if (Volume.isDragging) {
                    Volume.isDragging = false;
                    document.getElementById('volume-bar').classList.remove('pulse');
                    Volume.timer = setTimeout(Volume.hide, 3000);
                    // Reset transform
                    document.getElementById('volume-bar').style.transform = 'none';
                }
            },

            toggleSilent: () => {
                Volume.silent = !Volume.silent;
                const btn = document.getElementById('silent-btn');

                Volume.show();

                if (Volume.silent) {
                    btn.classList.add('silent-active');
                    if (typeof Island !== 'undefined' && Island.notify) {
                        Island.notify('Silent Mode', 'On', 'fa-bell-slash');
                    }
                } else {
                    btn.classList.remove('silent-active');
                    if (typeof Island !== 'undefined' && Island.notify) {
                        Island.notify('Ring', 'On', 'fa-bell');
                    }
                }
            },

            setLevel: (val) => {
                const oldVal = Volume.level;
                // Clamp
                if (val < 0) val = 0;
                if (val > 100) val = 100;
                Volume.level = val;

                // Update CSS
                const fill = document.querySelector('.vol-fill');
                const icon = document.getElementById('vol-icon');
                if (!fill || !icon) return;

                fill.style.height = `${val}%`;

                // Update Icon State
                if (val <= 1) icon.className = 'fas fa-volume-mute vol-icon';
                else if (val < 50) icon.className = 'fas fa-volume-down vol-icon';
                else icon.className = 'fas fa-volume-up vol-icon';

                // NUDGE ANIMATION LOGIC
                const bar = document.getElementById('volume-bar');
                const delta = val - oldVal;

                if (Math.abs(delta) > 0) {
                    if (Volume.isDragging) {
                        // SUSTAINED OFFSET: Hold UP (-10px) or DOWN (10px)
                        if (delta > 0) {
                            bar.style.transform = 'translateY(-10px)';
                        } else {
                            bar.style.transform = 'translateY(10px)';
                        }
                    } else {
                        // CLICK: Quick Nudge
                        if (delta > 0) bar.style.transform = 'translateY(-10px)';
                        else bar.style.transform = 'translateY(10px)';

                        setTimeout(() => {
                            if (!Volume.isDragging) bar.style.transform = 'none';
                        }, 200);
                    }
                }
            }
        };

        // Close volume on global click outside
        document.addEventListener('click', (e) => {
            const overlay = document.getElementById('volume-overlay');
            // If click is outside overlay and NOT on vol buttons
            if (overlay.classList.contains('active') && !overlay.contains(e.target) && !e.target.id.includes('vol-') && !Volume.isDragging) {
                Volume.hide();
            }
        });

        // Init volume after load
        setTimeout(Volume.init, 100);

        OS.init();