// Make selectLevel function available globally
window.selectLevel = function(level) {
    console.log('Level selected:', level);
    currentLevel = level;
    document.getElementById('level').textContent = `Level: ${level.charAt(0).toUpperCase() + level.slice(1)}`;
    startGame();
};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');

// Sound effects
const catchSound = document.getElementById('catchSound');
const powerupSound = document.getElementById('powerupSound');
const missSound = document.getElementById('missSound');
const levelCompleteSound = document.getElementById('levelCompleteSound');

// Configure sounds
[catchSound, powerupSound, levelCompleteSound].forEach(sound => {
    sound.volume = 0.10; // Set default volume to 50%
});
[missSound].forEach(sound => {
    sound.volume = 0.1; // Set default volume to 50%
});

// Sound effect functions
function playSound(sound) {
    if (sound.paused) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log("Sound play failed:", e));
    } else {
        // Create and play a clone for overlapping sounds
        const clone = sound.cloneNode();
        clone.volume = sound.volume;
        clone.play().catch(e => console.log("Sound play failed:", e));
    }
}

// Game state
let gameActive = false;
let gamePaused = false;
let timeLeft = 60;
let score = 0;
let highScores = {
    easy: 0,
    medium: 0,
    hard: 0
};
let powerUpActive = false;
let lastPowerUpTime = 0;
let currentLevel = 'easy';

// Load high scores from localStorage
function loadHighScores() {
    const savedScores = localStorage.getItem('appleGameHighScores');
    if (savedScores) {
        highScores = JSON.parse(savedScores);
        updateHighScoreDisplay();
    }
}

// Save high scores to localStorage
function saveHighScores() {
    localStorage.setItem('appleGameHighScores', JSON.stringify(highScores));
}

// Update high score display
function updateHighScoreDisplay() {
    const highScoreElement = document.getElementById('highScore');
    highScoreElement.textContent = `High Score: ${highScores[currentLevel]}`;
}

// Level selection function
function selectLevel(level) {
    console.log('Level selected:', level);
    currentLevel = level;
    document.getElementById('level').textContent = `Level: ${level.charAt(0).toUpperCase() + level.slice(1)}`;
    startGame();
}
let sensitivity = 10;
let controlType = 'arrows';
let lastTime = 0;
let deltaTime = 0;

// Level configurations
const levelConfig = {
    easy: {
        appleSpeed: 3,
        powerUpFrequency: 0.001,
        timeLimit: 60
    },
    medium: {
        appleSpeed: 5,
        powerUpFrequency: 0.0008,
        timeLimit: 45
    },
    hard: {
        appleSpeed: 7,
        powerUpFrequency: 0.0005,
        timeLimit: 30
    }
};

// Basket properties
const basket = {
    width: 80,
    height: 20,
    x: canvas.width / 2 - 40,
    y: canvas.height - 30,
    speed: 10,
    color: '#8B4513',
    glowing: false
};

// Apple types
const appleTypes = [
    { color: '#ff0000', points: 1, speed: 5, probability: 0.6 },
    { color: '#ffd700', points: 3, speed: 7, probability: 0.3 },
    { color: '#9400d3', points: 5, speed: 9, probability: 0.1 }
];

// Power-up types
const powerUpTypes = [
    { color: '#00ff00', effect: 'wider_basket', duration: 5000 },
    { color: '#00ffff', effect: 'slow_time', duration: 5000 },
    { color: '#ff69b4', effect: 'double_points', duration: 5000 }
];

// Apple properties
const apple = {
    radius: 15,
    x: Math.random() * (canvas.width - 30) + 15,
    y: -15,
    type: appleTypes[0],
    speed: 5
};

// Initialize score in game state above

let timerInterval;

// Timer function
let lastTickTime = 0;
function updateTimer() {
    if (!gameActive || gamePaused) return;
    
    const currentTime = Date.now();
    if (!lastTickTime) lastTickTime = currentTime;
    
    if (currentTime - lastTickTime >= 1000) {
        timeLeft--;
        timerDisplay.textContent = `Time: ${timeLeft}s`;
        lastTickTime = currentTime;
        
        if (timeLeft <= 0) {
            gameActive = false;
            clearInterval(timerInterval);
            showGameOver();
            return;
        }
    }
}

// Start timer
setInterval(updateTimer, 1000);

// Power-up functions
function createPowerUp() {
    if (!gameActive || powerUpActive) return;
    const now = Date.now();
    if (now - lastPowerUpTime < 10000) return; // Minimum 10s between power-ups
    
    const powerUp = {
        x: Math.random() * (canvas.width - 30) + 15,
        y: -15,
        radius: 10,
        type: powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]
    };
    return powerUp;
}

function activatePowerUp(type) {
    powerUpActive = true;
    lastPowerUpTime = Date.now();
    playSound(powerupSound);

    switch(type.effect) {
        case 'wider_basket':
            const originalWidth = basket.width;
            basket.width *= 1.5;
            setTimeout(() => { basket.width = originalWidth; powerUpActive = false; }, type.duration);
            break;
        case 'slow_time':
            const originalSpeed = apple.speed;
            apple.speed *= 0.5;
            setTimeout(() => { apple.speed = originalSpeed; powerUpActive = false; }, type.duration);
            break;
        case 'double_points':
            basket.glowing = true;
            setTimeout(() => { basket.glowing = false; powerUpActive = false; }, type.duration);
            break;
    }
}

// Particle system for visual effects
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 2;
        this.speedX = Math.random() * 6 - 3;
        this.speedY = Math.random() * 6 - 3;
        this.life = 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.02;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color + Math.floor(this.life * 255).toString(16);
        ctx.fill();
    }
}

let particles = [];

// Game control functions
function initializeGame() {
    const levelBtns = document.querySelectorAll('[data-level]');
    const settingsBtn = document.getElementById('settingsBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const newGameBtn = document.getElementById('newGameBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const restartBtn = document.getElementById('restartBtn');
    const sensitivitySlider = document.getElementById('sensitivity');
    const controlTypeRadios = document.querySelectorAll('input[name="controlType"]');
    const saveSettingsBtn = document.getElementById('saveSettings');

    // Level selection
    document.querySelectorAll('[data-level]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            currentLevel = btn.dataset.level;
            document.getElementById('level').textContent = `Level: ${currentLevel.charAt(0).toUpperCase() + currentLevel.slice(1)}`;
            startGame();
            console.log('Level selected:', currentLevel); // Debug log
        });
    });

    // Settings
    settingsBtn.addEventListener('click', () => {
        gamePaused = true;
        document.getElementById('settingsMenu').classList.remove('hidden');
    });

    saveSettingsBtn.addEventListener('click', () => {
        sensitivity = parseInt(sensitivitySlider.value);
        const selectedControl = document.querySelector('input[name="controlType"]:checked');
        if (selectedControl) {
            controlType = selectedControl.value;
        }
        document.getElementById('settingsMenu').classList.add('hidden');
        gamePaused = false;
    });

    // Game controls
    pauseBtn.addEventListener('click', togglePause);
    newGameBtn.addEventListener('click', showLevelSelection);
    resumeBtn.addEventListener('click', togglePause);
    restartBtn.addEventListener('click', () => {
        togglePause();
        showLevelSelection();
    });

    // Mouse control
    canvas.addEventListener('mousemove', (e) => {
        if (controlType === 'mouse' && gameActive && !gamePaused) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            basket.x = Math.max(0, Math.min(canvas.width - basket.width, mouseX - basket.width / 2));
        }
    });
}

// Keyboard input handling with smooth movement
const keys = { left: false, right: false };

window.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'Escape' && gameActive) togglePause();
});

window.addEventListener('keyup', function(e) {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
});

function updateBasketPosition() {
    if (!gameActive || gamePaused || controlType !== 'arrows') return;
    
    const moveSpeed = (basket.speed * sensitivity / 10) * (deltaTime / 16.67); // Adjust for frame rate
    
    if (keys.left) basket.x = Math.max(0, basket.x - moveSpeed);
    if (keys.right) basket.x = Math.min(canvas.width - basket.width, basket.x + moveSpeed);
}

function togglePause() {
    gamePaused = !gamePaused;
    document.getElementById('pauseOverlay').classList.toggle('hidden');
    
    if (gamePaused) {
        // Clear the timer interval when paused
        clearInterval(timerInterval);
        lastTickTime = 0; // Reset tick time when paused
    } else {
        // Restart the timer interval when unpaused
        lastTickTime = Date.now(); // Set new reference time
        timerInterval = setInterval(updateTimer, 100);
        requestAnimationFrame(gameLoop);
    }
}

function showLevelSelection() {
    gameActive = false;
    gamePaused = false;
    clearInterval(timerInterval); // Clear any existing timer
    document.getElementById('gameMenu').classList.remove('hidden');
    document.getElementById('pauseOverlay').classList.add('hidden');
}

function startGame() {
    // Clear any existing timer
    clearInterval(timerInterval);
    
    // Reset game state and timer variables
    score = 0;
    lastTickTime = 0;
    scoreDisplay.textContent = 'Score: 0';
    timeLeft = levelConfig[currentLevel].timeLimit;
    timerDisplay.textContent = `Time: ${timeLeft}s`;
    
    // Configure game based on level
    apple.speed = levelConfig[currentLevel].appleSpeed;
    
    // Hide menus and start game
    document.getElementById('gameMenu').classList.add('hidden');
    gameActive = true;
    gamePaused = false;
    
    // Start timer and game loop
    timerInterval = setInterval(updateTimer, 100); // Check more frequently but only update once per second
    requestAnimationFrame(gameLoop);
}

function drawBasket() {
    if (basket.glowing) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ffff00';
    }
    
    // Draw basket base
    ctx.fillStyle = basket.color;
    ctx.fillRect(basket.x, basket.y, basket.width, basket.height);
    
    // Draw basket details
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i = 0; i < 4; i++) {
        ctx.moveTo(basket.x + (i * basket.width/3), basket.y);
        ctx.lineTo(basket.x + (i * basket.width/3), basket.y + basket.height);
    }
    ctx.stroke();
    
    ctx.shadowBlur = 0;
}

function drawApple() {
    // Draw apple body
    ctx.beginPath();
    ctx.arc(apple.x, apple.y, apple.radius, 0, Math.PI * 2);
    ctx.fillStyle = apple.type.color;
    ctx.fill();
    
    // Add shine effect
    ctx.beginPath();
    ctx.arc(apple.x - apple.radius/3, apple.y - apple.radius/3, apple.radius/4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
    
    // Draw stem
    ctx.beginPath();
    ctx.moveTo(apple.x, apple.y - apple.radius);
    ctx.quadraticCurveTo(
        apple.x + 5, apple.y - apple.radius - 5,
        apple.x, apple.y - apple.radius - 8
    );
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw leaf
    ctx.beginPath();
    ctx.moveTo(apple.x, apple.y - apple.radius - 6);
    ctx.quadraticCurveTo(
        apple.x + 8, apple.y - apple.radius - 8,
        apple.x + 6, apple.y - apple.radius - 12
    );
    ctx.fillStyle = '#228B22';
    ctx.fill();
}

function resetApple() {
    apple.x = Math.random() * (canvas.width - 30) + 15;
    apple.y = -15;
    
    // Randomly select apple type based on probability
    const rand = Math.random();
    let cumProb = 0;
    for(let type of appleTypes) {
        cumProb += type.probability;
        if(rand <= cumProb) {
            apple.type = type;
            apple.speed = type.speed;
            break;
        }
    }
}

function createParticles(x, y, color) {
    for(let i = 0; i < 8; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function checkCatch() {
    // Collision detection
    if (
        apple.y + apple.radius > basket.y &&
        apple.x > basket.x &&
        apple.x < basket.x + basket.width
    ) {
        // Calculate points
        let points = apple.type.points;
        if(basket.glowing) points *= 2; // Double points power-up
        
        // Update score without affecting timer
        score += points;
        scoreDisplay.textContent = 'Score: ' + score;
        
        // Visual and sound effects
        createParticles(apple.x, apple.y, apple.type.color);
        
        // Play catch sound with different pitch based on apple type
        const sound = catchSound.cloneNode();
        sound.playbackRate = apple.type.points * 0.5; // Higher pitch for special apples
        playSound(sound);
        
        resetApple();
        return true; // Caught successfully
    } else if(apple.y - apple.radius > canvas.height) {
        // Apple was missed
        playSound(missSound);
        createParticles(apple.x, canvas.height, '#ff0000'); // Red particles for miss
        resetApple();
        return false; // Missed the apple
    }
    return null; // No collision yet
}


function gameLoop(timestamp) {
    if (!gameActive || gamePaused) return;
    
    // Calculate delta time for smooth movement
    if (!lastTime) lastTime = timestamp;
    deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update basket position for smooth movement
    updateBasketPosition();
    
    // Update and draw particles
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    // Randomly create power-up based on level
    if(Math.random() < levelConfig[currentLevel].powerUpFrequency) {
        const powerUp = createPowerUp();
        if(powerUp) {
            // Check if power-up is caught
            if(
                powerUp.y + powerUp.radius > basket.y &&
                powerUp.x > basket.x &&
                powerUp.x < basket.x + basket.width
            ) {
                activatePowerUp(powerUp.type);
            } else if(powerUp.y - powerUp.radius > canvas.height) {
                // Power-up was missed
            } else {
                // Draw power-up
                ctx.beginPath();
                ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
                ctx.fillStyle = powerUp.type.color;
                ctx.fill();
                powerUp.y += levelConfig[currentLevel].appleSpeed;
            }
        }
    }
    
    drawBasket();
    drawApple();

    apple.y += apple.speed;
    checkCatch();

    requestAnimationFrame(gameLoop);
}

// Game over handling
function showGameOver() {
    const modal = document.getElementById('gameOverModal');
    const finalScoreElement = document.getElementById('finalScore');
    const modalHighScoreElement = document.getElementById('modalHighScore');
    const newHighScoreElement = document.getElementById('newHighScore');
    const playAgainBtn = document.getElementById('playAgainBtn');
    const changeLevelBtn = document.getElementById('changeLevelBtn');

    // Update scores
    finalScoreElement.textContent = score;
    modalHighScoreElement.textContent = highScores[currentLevel];

    // Check for new high score
    if (score > highScores[currentLevel]) {
        highScores[currentLevel] = score;
        saveHighScores();
        newHighScoreElement.classList.remove('hidden');
        playSound(levelCompleteSound);
    } else {
        newHighScoreElement.classList.add('hidden');
    }

    // Update high score display
    updateHighScoreDisplay();

    // Show modal
    modal.classList.remove('hidden');

    // Set up button listeners
    playAgainBtn.onclick = () => {
        modal.classList.add('hidden');
        startGame();
    };

    changeLevelBtn.onclick = () => {
        modal.classList.add('hidden');
        showLevelSelection();
    };
}

// Initialize and start the game
initializeGame();
showLevelSelection();