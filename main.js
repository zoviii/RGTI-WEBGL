import { ResizeSystem } from 'engine/systems/ResizeSystem.js';
import { UpdateSystem } from 'engine/systems/UpdateSystem.js';

import { GLTFLoader } from 'engine/loaders/GLTFLoader.js';
import { JSONLoader } from 'engine/loaders/JSONLoader.js';
import { ImageLoader } from 'engine/loaders/ImageLoader.js';

import { FirstPersonController } from 'engine/controllers/FirstPersonController.js';
import { LinearAnimator } from 'engine/animators/LinearAnimator.js';

import {
    Camera,
    Model,
    Entity,
    Transform,
    Texture,
    Sampler,
    Material,
    Primitive,
} from 'engine/core/core.js';

import { Renderer } from './Renderer.js';
import { Light } from './Light.js';
import {
    chooseCatAIState,
    getCatBehavior,
    faceCatToMovement,
} from './CatAI.js';

const canvas = document.querySelector('canvas');
const renderer = new Renderer(canvas);
await renderer.initialize();

// =========================
//  GAME STATE + UI OVERLAYI
// =========================
let gameState = 'start'; // 'start' | 'playing' | 'ended'

// --- counter (zgoraj levo) ---
const counterEl = document.createElement('div');
counterEl.style.position = 'fixed';
counterEl.style.top = '10px';
counterEl.style.left = '10px';
counterEl.style.padding = '6px 10px';
counterEl.style.background = 'rgba(0,0,0,0.5)';
counterEl.style.color = 'white';
counterEl.style.fontFamily = 'system-ui, sans-serif';
counterEl.style.fontSize = '14px';
counterEl.style.zIndex = '20';
counterEl.innerText = 'Cats: 0 / 0';
document.body.appendChild(counterEl);

const holdTimerEl = document.createElement('div');
holdTimerEl.style.position = 'fixed';
holdTimerEl.style.top = '14px';
holdTimerEl.style.left = '50%';
holdTimerEl.style.transform = 'translateX(-50%)';
holdTimerEl.style.width = '280px';
holdTimerEl.style.padding = '4px';
holdTimerEl.style.background = 'rgba(0, 0, 0, 0.65)';
holdTimerEl.style.border = '2px solid white';
holdTimerEl.style.borderRadius = '5px';
holdTimerEl.style.display = 'none';
holdTimerEl.style.zIndex = '25';

const holdTimerBarEl = document.createElement('div');
holdTimerBarEl.style.height = '18px';
holdTimerBarEl.style.width = '100%';
holdTimerBarEl.style.background = '#ffe600';
holdTimerBarEl.style.transition = 'width 0.08s linear, background 0.15s linear';
holdTimerEl.appendChild(holdTimerBarEl);
document.body.appendChild(holdTimerEl);

const statusEl = document.createElement('div');
statusEl.style.position = 'fixed';
statusEl.style.left = '50%';
statusEl.style.bottom = '24px';
statusEl.style.transform = 'translateX(-50%)';
statusEl.style.padding = '8px 14px';
statusEl.style.background = 'rgba(0, 0, 0, 0.65)';
statusEl.style.color = 'white';
statusEl.style.fontFamily = 'system-ui, sans-serif';
statusEl.style.fontSize = '15px';
statusEl.style.textAlign = 'center';
statusEl.style.zIndex = '25';
statusEl.textContent = 'Poišči mačke in hrano.';
document.body.appendChild(statusEl);

let audioContext = null;

function playSound(frequency, duration = 0.12, type = 'sine') {
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
}

function setStatus(message, sound) {
    statusEl.textContent = message;
    if (sound) playSound(...sound);
}

// --- START SCREEN ---
const startOverlay = document.createElement('div');
startOverlay.style.position = 'fixed';
startOverlay.style.inset = '0';
startOverlay.style.background = '#15110f';
startOverlay.style.display = 'flex';
startOverlay.style.alignItems = 'center';
startOverlay.style.justifyContent = 'center';
startOverlay.style.color = 'white';
startOverlay.style.fontFamily = 'Georgia, serif';
startOverlay.style.zIndex = '30';

const introStyle = document.createElement('style');
introStyle.textContent = `
    .cat-intro-panel {
        width: min(760px, calc(100vw - 36px));
        max-height: calc(100vh - 36px);
        overflow: auto;
        padding: clamp(24px, 5vw, 52px);
        box-sizing: border-box;
        border: 1px solid rgba(255, 227, 155, 0.3);
        background: #211916;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
    }
    .cat-intro-kicker {
        margin: 0 0 12px;
        color: #e7ae54;
        font: 700 12px/1.2 system-ui, sans-serif;
        letter-spacing: 0.18em;
        text-transform: uppercase;
    }
    .cat-intro-title {
        margin: 0;
        color: #fff3d4;
        font-size: clamp(42px, 8vw, 76px);
        line-height: 0.95;
        letter-spacing: 0;
    }
    .cat-intro-subtitle {
        max-width: 560px;
        margin: 20px 0 28px;
        color: #d7c6ad;
        font: 16px/1.6 system-ui, sans-serif;
    }
    .cat-intro-mission {
        margin: 0 0 28px;
        padding: 14px 16px;
        border-left: 3px solid #e7ae54;
        background: #2b211b;
        color: #fff3d4;
        font: 700 15px/1.45 system-ui, sans-serif;
    }
    .cat-intro-features {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 28px;
    }
    .cat-intro-feature {
        min-height: 104px;
        padding: 14px;
        box-sizing: border-box;
        border-top: 1px solid rgba(255, 227, 155, 0.28);
        background: #191412;
    }
    .cat-intro-feature strong {
        display: block;
        margin-bottom: 8px;
        color: #e7ae54;
        font: 700 13px/1.2 system-ui, sans-serif;
        text-transform: uppercase;
    }
    .cat-intro-feature span {
        color: #cbbba6;
        font: 13px/1.45 system-ui, sans-serif;
    }
    .cat-intro-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 9px 16px;
        margin-bottom: 28px;
        color: #bcae9c;
        font: 13px/1.4 system-ui, sans-serif;
    }
    .cat-intro-key {
        display: inline-block;
        min-width: 24px;
        margin-right: 5px;
        padding: 3px 6px;
        border: 1px solid #806448;
        background: #33261e;
        color: #fff3d4;
        text-align: center;
        font-weight: 700;
    }
    .cat-intro-button {
        padding: 13px 24px;
        border: 0;
        background: #e7ae54;
        color: #211611;
        cursor: pointer;
        font: 700 14px system-ui, sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }
    .cat-intro-button:hover { background: #ffd27b; }
    @media (max-width: 620px) {
        .cat-intro-features { grid-template-columns: 1fr; }
        .cat-intro-panel { padding: 28px 22px; }
    }
`;
document.head.appendChild(introStyle);

const introPanel = document.createElement('main');
introPanel.className = 'cat-intro-panel';

const introKicker = document.createElement('p');
introKicker.className = 'cat-intro-kicker';
introKicker.textContent = 'Night shift // Room 04';

const startTitle = document.createElement('h1');
startTitle.className = 'cat-intro-title';
startTitle.textContent = 'Cat Catcher';

const startSubtitle = document.createElement('p');
startSubtitle.className = 'cat-intro-subtitle';
startSubtitle.textContent = 'The house is quiet. The cats are not. Find them before they turn the rooms upside down.';

const mission = document.createElement('p');
mission.className = 'cat-intro-mission';
mission.textContent = 'MISSION 01  /  Find the food. Lure a cat. Carry it to the matching orange spot.';

const features = document.createElement('div');
features.className = 'cat-intro-features';

for (const [title, description] of [
    ['Search', 'Check under the table, behind the wardrobe and inside the box.'],
    ['Stay sharp', 'Cats dodge, teleport, knock things over and sometimes fight back.'],
    ['Move fast', 'You have 10 seconds to carry a caught cat to its glowing target.'],
]) {
    const feature = document.createElement('div');
    feature.className = 'cat-intro-feature';
    const featureTitle = document.createElement('strong');
    featureTitle.textContent = title;
    const featureText = document.createElement('span');
    featureText.textContent = description;
    feature.append(featureTitle, featureText);
    features.appendChild(feature);
}

const controls = document.createElement('div');
controls.className = 'cat-intro-controls';
controls.innerHTML = '<span><b class="cat-intro-key">WASD</b> move</span><span><b class="cat-intro-key">SHIFT</b> sprint</span><span><b class="cat-intro-key">CTRL</b> crouch</span><span><b class="cat-intro-key">E</b> interact</span><span><b class="cat-intro-key">L</b> laser</span><span><b class="cat-intro-key">SPACE</b> jump</span>';

const startButton = document.createElement('button');
startButton.className = 'cat-intro-button';
startButton.textContent = 'Start game';

introPanel.append(introKicker, startTitle, startSubtitle, mission, features, controls, startButton);
startOverlay.appendChild(introPanel);
document.body.appendChild(startOverlay);

// --- END SCREEN ---
const endOverlay = document.createElement('div');
endOverlay.style.position = 'fixed';
endOverlay.style.inset = '0';
endOverlay.style.background = 'rgba(0,0,0,0.85)';
endOverlay.style.display = 'none';
endOverlay.style.flexDirection = 'column';
endOverlay.style.alignItems = 'center';
endOverlay.style.justifyContent = 'center';
endOverlay.style.color = 'white';
endOverlay.style.fontFamily = 'system-ui, sans-serif';
endOverlay.style.zIndex = '40';

const endTitle = document.createElement('h1');
endTitle.textContent = 'Bravo!';
endTitle.style.marginBottom = '16px';

const endText = document.createElement('p');
endText.textContent = 'Ujel si vse mačke.';
endText.style.marginBottom = '20px';

const restartButton = document.createElement('button');
restartButton.textContent = 'Play again';
restartButton.style.padding = '10px 22px';
restartButton.style.fontSize = '16px';
restartButton.style.cursor = 'pointer';
restartButton.style.borderRadius = '6px';
restartButton.style.border = 'none';

endOverlay.appendChild(endTitle);
endOverlay.appendChild(endText);
endOverlay.appendChild(restartButton);
document.body.appendChild(endOverlay);

// gumbi
startButton.addEventListener('click', () => {
    gameState = 'playing';
    startOverlay.style.display = 'none';
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    setStatus('Poišči rumeno hrano ali skrito mačko.');
});

restartButton.addEventListener('click', () => {
    // najlažji "reset v prvo pozicijo"
    window.location.reload();
});

// =========================
//  COUNTER LOGIKA
// =========================
let totalCats = 0;
let caughtCats = 0;

function updateCounter() {
    counterEl.innerText = `Cats: ${caughtCats} / ${totalCats}`;
}

// =========================
//  SCENA IZ GLTF (kamera)
// =========================
const gltfLoader = new GLTFLoader();
await gltfLoader.load(new URL('./models/monkey/monkey.gltf', import.meta.url));
const scene = gltfLoader.loadScene(gltfLoader.defaultScene);

const camera = scene.find(entity => entity.getComponentOfType(Camera));
const cameraTransform = camera.getComponentOfType(Transform);

const GROUND_HEIGHT = 1.7;
const CROUCH_HEIGHT = 0.95;

if (cameraTransform) {
    cameraTransform.translation = [0, GROUND_HEIGHT, 18];
}

const firstPersonController = new FirstPersonController(camera, canvas, {
    pitch: 0,
    yaw: 0,
    maxSpeed: 5,
    acceleration: 20,
    decay: 0.92,
});
camera.addComponent(firstPersonController);

const monkeyIndex = scene.findIndex(entity => entity.getComponentOfType(Model));
if (monkeyIndex !== -1) {
    scene.splice(monkeyIndex, 1);
}

// =========================
//  LUČ NAD SOB0
// =========================
const light = new Entity();
const ROOM_HALF_SIZE = 22;
const ROOM_HEIGHT = 8;
const ROOM_DIVIDER = 0;
const colliders = [];

light.addComponent(new Transform({
    translation: [0, ROOM_HEIGHT - 1, 0],
}));
light.addComponent(new Light({
    ambient: 0.35,
}));
light.addComponent(new LinearAnimator(light, {
    startPosition: [0, ROOM_HEIGHT - 1, 0],
    endPosition: [2, ROOM_HEIGHT - 1, 2],
    duration: 4,
    loop: true,
}));
scene.push(light);

//  NALOŽIMO CUBE MESH + TEKSTURE
// =========================
const jsonLoader = new JSONLoader();
const imageLoader = new ImageLoader();

const cubeMesh = await jsonLoader.load(
    new URL('./models/cube/cube.json', import.meta.url)
);

const cubeDiffuseImage = await imageLoader.load(
    new URL('./models/cube/cube-diffuse.png', import.meta.url)
);

const cubeSampler = new Sampler({
    minFilter: 'linear',
    magFilter: 'linear',
    mipmapFilter: 'linear',
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    addressModeW: 'repeat',
    maxAnisotropy: 1,
});

const cubeTexture = new Texture({
    image: cubeDiffuseImage,
    sampler: cubeSampler,
    isSRGB: true,
});

// tekstura za tla (les)
const floorImage = await imageLoader.load(
    new URL('./textures/floor.png', import.meta.url)
);

const floorSampler = new Sampler({
    minFilter: 'linear',
    magFilter: 'linear',
    mipmapFilter: 'linear',
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    addressModeW: 'repeat',
    maxAnisotropy: 1,
});

const floorTexture = new Texture({
    image: floorImage,
    sampler: floorSampler,
    isSRGB: true,
});

const wallFloorMaterial = new Material({
    baseTexture: cubeTexture,
    baseFactor: [1, 1, 1, 1],
});

const floorMaterial = new Material({
    baseTexture: floorTexture,
    baseFactor: [1, 1, 1, 1],
});

const dropZoneMaterial = new Material({
    baseTexture: floorTexture,
    baseFactor: [1, 0.55, 0.12, 1],
});

const foodMaterial = new Material({
    baseTexture: cubeTexture,
    baseFactor: [1, 0.85, 0.1, 1],
});

function createCubeModel(material) {
    const primitive = new Primitive({
        mesh: cubeMesh,
        material,
    });
    return new Model({
        primitives: [primitive],
    });
}

const propMaterial = new Material({
    baseTexture: cubeTexture,
    baseFactor: [0.8, 0.25, 0.7, 1],
});

const interactiveProps = [];

// Predmete hranim posebej, ker jih lahko mačke prevrnejo, igralec pa pospravi.
function addInteractiveProp(name, position, scale) {
    const prop = new Entity();
    const transform = new Transform({
        translation: [...position],
        rotation: [0, 0, 0, 1],
        scale: [...scale],
    });
    prop.addComponent(transform);
    prop.addComponent(createCubeModel(propMaterial));
    scene.push(prop);

    const collider = {
        transform,
        halfSize: [...scale],
        enabled: true,
        isWall: true,
    };
    colliders.push(collider);
    interactiveProps.push({
        name,
        entity: prop,
        transform,
        collider,
        knocked: false,
    });
}

addInteractiveProp('vaza', [6, 0.8, 18], [0.6, 0.8, 0.6]);
addInteractiveProp('svetilka', [-6, 1.2, -18], [0.45, 1.2, 0.45]);
addInteractiveProp('skatla', [18, 0.7, -6], [1.2, 0.7, 1.2]);

const laserMaterial = new Material({
    baseTexture: cubeTexture,
    baseFactor: [1, 0.05, 0.05, 1],
});
const laserPoint = new Entity();
const laserPointTransform = new Transform({
    translation: [0, -10, 0],
    rotation: [0, 0, 0, 1],
    scale: [0.18, 0.18, 0.18],
});
laserPoint.addComponent(laserPointTransform);
laserPoint.addComponent(createCubeModel(laserMaterial));
scene.push(laserPoint);
let laserActive = false;

const foodPositions = [
    [-17, -17], [17, -17], [-17, 17], [17, 17],
];

const foodItems = [];
for (const [x, z] of foodPositions) {
    const food = new Entity();
    const foodTransform = new Transform({
        translation: [x, 0.7, z],
        rotation: [0, 0, 0, 1],
        scale: [0.35, 0.35, 0.35],
    });
    food.addComponent(foodTransform);
    food.addComponent(createCubeModel(foodMaterial));
    scene.push(food);
    foodItems.push({ entity: food, transform: foodTransform, collected: false });
}

// =========================
//  JUMP FIZIKA
// =========================
let verticalVelocity = 0;
let isGrounded = true;
let isChargingJump = false;
let jumpCharge = 0;

const GRAVITY = -20;
const MAX_JUMP_CHARGE = 0.6;
const MIN_JUMP_FORCE = 5;
const MAX_JUMP_FORCE = 12;

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (gameState === 'playing' && isGrounded && !isChargingJump && !firstPersonController.isCrouching) {
            isChargingJump = true;
            jumpCharge = 0;
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        if (gameState === 'playing' && isChargingJump && isGrounded) {
            const t = Math.min(jumpCharge, MAX_JUMP_CHARGE) / MAX_JUMP_CHARGE;
            const jumpForce = MIN_JUMP_FORCE + t * (MAX_JUMP_FORCE - MIN_JUMP_FORCE);
            verticalVelocity = jumpForce;
            isGrounded = false;
        }
        isChargingJump = false;
    }
});

// =========================
//  TLA – GRID MALIH PLOŠČIC
// =========================
const tileSize = 2;
const halfTile = tileSize / 2;

for (let x = -ROOM_HALF_SIZE; x < ROOM_HALF_SIZE; x += tileSize) {
    for (let z = -ROOM_HALF_SIZE; z < ROOM_HALF_SIZE; z += tileSize) {
        const tile = new Entity();
        tile.addComponent(new Transform({
            translation: [x + halfTile, 0, z + halfTile],
            rotation: [0, 0, 0, 1],
            scale: [tileSize / 2, 0.25, tileSize / 2],
        }));
        tile.addComponent(createCubeModel(floorMaterial));
        scene.push(tile);
    }
}

const dropZonePositions = [
    [-10, -10], [-5, -10], [5, -10], [10, -10],
    [-10, 10], [-5, 10], [5, 10], [10, 10],
];
const DROP_ZONE_RADIUS = 1.5;
const dropZones = dropZonePositions.map(([x, z]) => {
    const dropZone = new Entity();
    const material = new Material({
        baseTexture: floorTexture,
        baseFactor: [1, 0.55, 0.12, 1],
    });
    dropZone.addComponent(new Transform({
        translation: [x, 0.34, z],
        rotation: [0, 0, 0, 1],
        scale: [DROP_ZONE_RADIUS, 0.08, DROP_ZONE_RADIUS],
    }));
    dropZone.addComponent(createCubeModel(material));
    scene.push(dropZone);
    return { position: [x, z], occupied: false, material };
});

function setDropZoneColor(dropZone, color) {
    dropZone.material.baseFactor = [...color, 1];
}

function addCollider(transform, halfSize, options = {}) {
    colliders.push({
        transform,
        halfSize,
        enabled: true,
        ...options,
    });
}

function addFurniturePart(translation, scale, material = wallFloorMaterial) {
    const furniture = new Entity();
    const transform = new Transform({
        translation,
        rotation: [0, 0, 0, 1],
        scale,
    });
    furniture.addComponent(transform);
    furniture.addComponent(createCubeModel(material));
    scene.push(furniture);
    addCollider(transform, scale, { isWall: true });
}

// To so skrivališča, kjer se mačke lahko skrijejo pred igralcem.
addFurniturePart([-17, 3, -17], [3, 0.3, 2]);
for (const [x, z] of [[-19.5, -17], [-14.5, -17], [-17, -18.5], [-17, -15.5]]) {
    addFurniturePart([x, 1.5, z], [0.3, 1.5, 0.3]);
}

addFurniturePart([17, 4, 17], [2, 4, 1]);
addFurniturePart([17, 1, 15.7], [2, 1, 0.2]);

addFurniturePart([-17, 0.5, 17], [2, 0.2, 2]);
addFurniturePart([-17, 1.5, 19], [2, 1, 0.2]);
addFurniturePart([-17, 1.5, 15], [2, 1, 0.2]);
addFurniturePart([-19, 1.5, 17], [0.2, 1, 2]);
addFurniturePart([-15, 1.5, 17], [0.2, 1, 2]);

// =========================
//  STROP + STENE
// =========================
const ceilingEntity = new Entity();
ceilingEntity.addComponent(new Transform({
    translation: [0, ROOM_HEIGHT, 0],
    rotation: [0, 0, 0, 1],
    scale: [ROOM_HALF_SIZE, 0.25, ROOM_HALF_SIZE],
}));
ceilingEntity.addComponent(createCubeModel(wallFloorMaterial));
scene.push(ceilingEntity);

const frontWall = new Entity();
frontWall.addComponent(new Transform({
    translation: [0, ROOM_HEIGHT / 2, -ROOM_HALF_SIZE],
    rotation: [0, 0, 0, 1],
    scale: [ROOM_HALF_SIZE, ROOM_HEIGHT / 2, 0.5],
}));
frontWall.addComponent(createCubeModel(wallFloorMaterial));
scene.push(frontWall);
addCollider(frontWall.getComponentOfType(Transform), [ROOM_HALF_SIZE, ROOM_HEIGHT / 2, 0.5], { isWall: true });

const backWall = new Entity();
backWall.addComponent(new Transform({
    translation: [0, ROOM_HEIGHT / 2, ROOM_HALF_SIZE],
    rotation: [0, 0, 0, 1],
    scale: [ROOM_HALF_SIZE, ROOM_HEIGHT / 2, 0.5],
}));
backWall.addComponent(createCubeModel(wallFloorMaterial));
scene.push(backWall);
addCollider(backWall.getComponentOfType(Transform), [ROOM_HALF_SIZE, ROOM_HEIGHT / 2, 0.5], { isWall: true });

const leftWall = new Entity();
leftWall.addComponent(new Transform({
    translation: [-ROOM_HALF_SIZE, ROOM_HEIGHT / 2, 0],
    rotation: [0, 0, 0, 1],
    scale: [0.5, ROOM_HEIGHT / 2, ROOM_HALF_SIZE],
}));
leftWall.addComponent(createCubeModel(wallFloorMaterial));
scene.push(leftWall);
addCollider(leftWall.getComponentOfType(Transform), [0.5, ROOM_HEIGHT / 2, ROOM_HALF_SIZE], { isWall: true });

const rightWall = new Entity();
rightWall.addComponent(new Transform({
    translation: [ROOM_HALF_SIZE, ROOM_HEIGHT / 2, 0],
    rotation: [0, 0, 0, 1],
    scale: [0.5, ROOM_HEIGHT / 2, ROOM_HALF_SIZE],
}));
rightWall.addComponent(createCubeModel(wallFloorMaterial));
scene.push(rightWall);
addCollider(rightWall.getComponentOfType(Transform), [0.5, ROOM_HEIGHT / 2, ROOM_HALF_SIZE], { isWall: true });

function addDivider(translation, scale) {
    const divider = new Entity();
    divider.addComponent(new Transform({
        translation,
        rotation: [0, 0, 0, 1],
        scale,
    }));
    divider.addComponent(createCubeModel(wallFloorMaterial));
    scene.push(divider);
    addCollider(divider.getComponentOfType(Transform), scale, { isWall: true });
}

// Notranje stene razdelijo prostor na sobe, vmes pa ostanejo odprta vrata.
addDivider([-ROOM_DIVIDER, ROOM_HEIGHT / 2, -14], [0.35, ROOM_HEIGHT / 2, 8]);
addDivider([-ROOM_DIVIDER, ROOM_HEIGHT / 2, 14], [0.35, ROOM_HEIGHT / 2, 8]);
addDivider([-14, ROOM_HEIGHT / 2, ROOM_DIVIDER], [8, ROOM_HEIGHT / 2, 0.35]);
addDivider([14, ROOM_HEIGHT / 2, ROOM_DIVIDER], [8, ROOM_HEIGHT / 2, 0.35]);

// =========================
//  KOLIDERJI MAČK IN SOB
// =========================

// =========================
//  MAČKE – RAZLIČNA GIBANJA
// =========================
const CAT_URL = new URL('./models/cat/cat.gltf', import.meta.url);

const cats = []; // { entity, transform, collider, state, type, ... }

async function spawnCat(startPos, setupFn) {
    const loader = new GLTFLoader();
    await loader.load(CAT_URL);
    const catScene = loader.loadScene(loader.defaultScene);
    const catEntity = catScene[0];

    const t = catEntity.getComponentOfType(Transform);
    t.translation = [...startPos];
    t.scale = [1.2, 1.2, 1.2];

    scene.push(catEntity);

    const collider = {
        transform: t,
        halfSize: [0.35, 0.9, 0.35],
        enabled: true,
    };
    colliders.push(collider);

    const cat = {
        entity: catEntity,
        transform: t,
        collider,
        state: 'free',
        id: cats.length,
        hidden: false,
        tangledTime: 0,
        angryTime: 0,
        missedAttempts: 0,
        followHeld: false,
        partner: null,
        teleportTimer: 9 + cats.length * 1.5,
        aiState: 'wander',
        aiTimer: 1.5 + Math.random() * 2,
        aiDirection: [1, 0],
        playful: false,
        personality: 'ordinary',
        holdTimeLimit: 10,
        destructive: false,
        canJump: true,
        canZoom: true,
        canHide: true,
        canAttack: true,
        jumpTime: 0,
        attackTime: 0,
        attackCooldown: 2 + Math.random() * 4,
        hideTime: 0,
        dropZoneIndex: cats.length,
        dir: 1,
        tParam: 0,
        baseY: startPos[1],
        originalRotation: [...t.rotation],
    };

    setupFn(cat);
    cats.push(cat);

    totalCats++;
    updateCounter();
}

// Mačke so razporejene po sobah in imajo različne osebnosti.
await spawnCat([-17, 1, -17], (cat) => {
    cat.hidden = true;
    cat.personality = 'shy';
    cat.holdTimeLimit = 6;
    cat.type = 'lineX';
    cat.minX = -19;
    cat.maxX = -15;
    cat.speed = 2.0;
});

await spawnCat([17, 1, 15.2], (cat) => {
    cat.hidden = true;
    cat.type = 'lineZ';
    cat.minZ = 14.5;
    cat.maxZ = 16;
    cat.speed = 1.8;
});

await spawnCat([-17, 1, 17], (cat) => {
    cat.hidden = true;
    cat.type = 'circle';
    cat.center = [-17, 17];
    cat.radius = 0.7;
    cat.angularSpeed = 0.8;
});

await spawnCat([-10, 1, 10], (cat) => {
    cat.personality = 'cautious';
    cat.type = 'diag';
    cat.minX = -13;
    cat.maxX = -3;
    cat.minZ = 7;
    cat.maxZ = 13;
    cat.speed = 2.2;
    cat.dirX = 1;
    cat.dirZ = -1;
});

await spawnCat([5, 1, 10], (cat) => {
    cat.playful = true;
    cat.type = 'jump';
    cat.circleCenter = [5, 10];
    cat.circleRadius = 1.8;
    cat.angularSpeed = 1.2;
    cat.jumpSpeed = 3.0;
    cat.tangledTime = 8;
});

await spawnCat([-10, 1, -10], (cat) => {
    cat.destructive = true;
    cat.type = 'lineZ';
    cat.minZ = -13;
    cat.maxZ = -3;
    cat.speed = 1.5;
});

await spawnCat([-10, 1, 5], (cat) => {
    cat.type = 'lineX';
    cat.minX = -13;
    cat.maxX = -3;
    cat.speed = 1.7;
});

await spawnCat([10, 1, 5], (cat) => {
    cat.type = 'diag';
    cat.minX = 3;
    cat.maxX = 13;
    cat.minZ = 3;
    cat.maxZ = 13;
    cat.speed = 1.6;
    cat.dirX = -1;
    cat.dirZ = 1;
});

cats[0].partner = cats[1];
cats[1].partner = cats[0];

// =========================
//  PRIJEM IN ODLAGANJE MAČKE S TIPKO E
// =========================
let heldCat = null;
let holdTimeRemaining = 0;
const HOLD_TIME_LIMIT = 10;
let catAttractionActive = false;

// Hrana se pobere samo, ko smo dovolj blizu. Po pobiranju začnejo mačke prihajati.
function tryCollectFood() {
    if (heldCat || catAttractionActive) return false;

    const playerPosition = camera.getComponentOfType(Transform).translation;
    const collectRadiusSq = 4;

    for (const food of foodItems) {
        if (food.collected) continue;

        const dx = playerPosition[0] - food.transform.translation[0];
        const dz = playerPosition[2] - food.transform.translation[2];
        if (dx * dx + dz * dz > collectRadiusSq) continue;

        food.collected = true;
        const foodIndex = scene.indexOf(food.entity);
        if (foodIndex !== -1) {
            scene.splice(foodIndex, 1);
        }
        catAttractionActive = true;
        setStatus('Hrana pobrana. Mačke prihajajo k tebi!', [660, 0.16, 'triangle']);
        return true;
    }

    return false;
}

function catPositionBlocked(x, z) {
    const catRadius = 0.65;

    for (const collider of colliders) {
        if (!collider.enabled || !collider.isWall) continue;

        const wallTransform = collider.transform;
        const wallPosition = wallTransform.translation;
        const wallHalfSize = collider.halfSize;
        const overlapsX = Math.abs(x - wallPosition[0]) < wallHalfSize[0] + catRadius;
        const overlapsZ = Math.abs(z - wallPosition[2]) < wallHalfSize[2] + catRadius;

        if (overlapsX && overlapsZ) return true;
    }

    return false;
}

function keepCatInsideRoom(cat, previousX, previousZ) {
    const position = cat.transform.translation;
    position[0] = Math.min(Math.max(position[0], -ROOM_HALF_SIZE + 1), ROOM_HALF_SIZE - 1);
    position[2] = Math.min(Math.max(position[2], -ROOM_HALF_SIZE + 1), ROOM_HALF_SIZE - 1);

    if (!catPositionBlocked(position[0], position[2])) return;

    const movementX = position[0] - previousX;
    const movementZ = position[2] - previousZ;
    const step = Math.max(Math.hypot(movementX, movementZ), 0.08);
    const movementAngle = Math.atan2(movementZ, movementX);
    const detourAngles = [
        Math.PI / 4, -Math.PI / 4,
        Math.PI / 2, -Math.PI / 2,
        (3 * Math.PI) / 4, -(3 * Math.PI) / 4,
        Math.PI,
    ];

    position[0] = previousX;
    position[2] = previousZ;

    for (const angleOffset of detourAngles) {
        const angle = movementAngle + angleOffset;
        const candidateX = previousX + Math.cos(angle) * step;
        const candidateZ = previousZ + Math.sin(angle) * step;
        const insideX = candidateX >= -ROOM_HALF_SIZE + 1 && candidateX <= ROOM_HALF_SIZE - 1;
        const insideZ = candidateZ >= -ROOM_HALF_SIZE + 1 && candidateZ <= ROOM_HALF_SIZE - 1;

        if (insideX && insideZ && !catPositionBlocked(candidateX, candidateZ)) {
            position[0] = candidateX;
            position[2] = candidateZ;
            cat.detourDirection = [Math.cos(angle), Math.sin(angle)];
            cat.detourTime = 0.7;
            return;
        }
    }
}

function updateHoldTimer() {
    // Sramežljiva mačka ima krajši čas, zato timer uporablja njeno omejitev.
    const timeLimit = heldCat?.holdTimeLimit ?? HOLD_TIME_LIMIT;
    const fraction = Math.max(0, holdTimeRemaining / timeLimit);
    holdTimerBarEl.style.width = `${fraction * 100}%`;
    holdTimerBarEl.style.background = fraction < 0.3 ? '#ff3b30' : '#ffe600';
    holdTimerEl.style.display = heldCat ? 'block' : 'none';
}

function releaseHeldCat() {
    if (!heldCat) return;

    const camT = camera.getComponentOfType(Transform);
    const fleeX = heldCat.transform.translation[0] - camT.translation[0];
    const fleeZ = heldCat.transform.translation[2] - camT.translation[2];
    const fleeLength = Math.hypot(fleeX, fleeZ) || 1;

    heldCat.transform.translation[1] = heldCat.baseY;
    heldCat.transform.scale = [1.2, 1.2, 1.2];
    heldCat.state = 'free';
    heldCat.collider.enabled = true;
    heldCat.fleeTime = 8;
    heldCat.fleeSpeed = 6;
    heldCat.fleeDirection = [fleeX / fleeLength, fleeZ / fleeLength];
    if (heldCat.partner) heldCat.partner.followHeld = false;
    setDropZoneColor(dropZones[heldCat.dropZoneIndex], [1, 0.55, 0.12]);
    heldCat = null;
    holdTimeRemaining = 0;
    updateHoldTimer();
    // Ko timer poteče, mačko spustimo nazaj v sceno z večjo hitrostjo.
    setStatus('Mačka ti je zbežala iz rok!', [180, 0.2, 'sawtooth']);
}

function getLookDirection() {
    const cosPitch = Math.cos(firstPersonController.pitch);
    return [
        -Math.sin(firstPersonController.yaw) * cosPitch,
        Math.sin(firstPersonController.pitch),
        -Math.cos(firstPersonController.yaw) * cosPitch,
    ];
}

function updateLaserPoint(cameraTransform) {
    if (!laserActive) {
        laserPointTransform.translation = [0, -10, 0];
        return;
    }

    const direction = getLookDirection();
    const distance = 7;
    laserPointTransform.translation = [
        cameraTransform.translation[0] + direction[0] * distance,
        cameraTransform.translation[1] + direction[1] * distance,
        cameraTransform.translation[2] + direction[2] * distance,
    ];
}

function tryCleanNearbyProp() {
    const playerPosition = camera.getComponentOfType(Transform).translation;

    for (const prop of interactiveProps) {
        if (!prop.knocked) continue;

        const dx = playerPosition[0] - prop.transform.translation[0];
        const dz = playerPosition[2] - prop.transform.translation[2];
        if (dx * dx + dz * dz > 4) continue;

        prop.knocked = false;
        prop.transform.rotation = [0, 0, 0, 1];
        setStatus(`Pospravil si predmet: ${prop.name}.`, [520, 0.1, 'sine']);
        return true;
    }

    return false;
}

function knockNearbyProp(catPosition) {
    for (const prop of interactiveProps) {
        if (prop.knocked) continue;

        const dx = catPosition[0] - prop.transform.translation[0];
        const dz = catPosition[2] - prop.transform.translation[2];
        if (dx * dx + dz * dz > 2.25) continue;

        prop.knocked = true;
        const halfTurn = Math.sin(Math.PI / 4);
        prop.transform.rotation = [halfTurn, 0, 0, halfTurn];
        setStatus(`Mačka je podrla predmet: ${prop.name}. Pritisni E.`, [120, 0.2, 'square']);
        return;
    }
}

function teleportCatIfUnseen(cat, playerPosition, lookDirection, dt) {
    const catPosition = cat.transform.translation;
    const toCatX = catPosition[0] - playerPosition[0];
    const toCatZ = catPosition[2] - playerPosition[2];
    const distance = Math.hypot(toCatX, toCatZ) || 1;
    const visibleDot = (toCatX / distance) * lookDirection[0] +
        (toCatZ / distance) * lookDirection[2];

    if (visibleDot > 0.25) {
        cat.teleportTimer = 9;
        return;
    }

    cat.teleportTimer -= dt;
    if (cat.teleportTimer > 0) return;

    const teleportSpots = [
        [-18, -18], [18, -18], [-18, 18], [18, 18],
        [-19, 6], [19, -6], [6, 19], [-6, -19],
    ];
    const [x, z] = teleportSpots[(cat.id + Math.floor(performance.now() / 1000)) % teleportSpots.length];
    if (!catPositionBlocked(x, z)) {
        cat.transform.translation[0] = x;
        cat.transform.translation[1] = cat.baseY;
        cat.transform.translation[2] = z;
        cat.teleportTimer = 9;
    }
}

function updateHeldCat() {
    if (!heldCat) return;

    const camT = camera.getComponentOfType(Transform);
    const direction = getLookDirection();
    const heldDistance = 1.6;
    const timeLimit = heldCat.holdTimeLimit ?? HOLD_TIME_LIMIT;
    const urgency = 1 - Math.max(0, holdTimeRemaining / timeLimit);
    const shake = urgency * 0.12;
    const shakeX = (Math.random() - 0.5) * shake;
    const shakeY = (Math.random() - 0.5) * shake;
    const catX = camT.translation[0] + direction[0] * heldDistance + shakeX;
    const catY = camT.translation[1] - 0.25 + direction[1] * heldDistance + shakeY;
    const catZ = camT.translation[2] + direction[2] * heldDistance;

    heldCat.transform.translation[0] = catX;
    heldCat.transform.translation[1] = catY;
    heldCat.transform.translation[2] = catZ;

    // Mačka se obrača proti kameri, proti koncu timerja pa se tudi trese.
    const facingAngle = Math.atan2(camT.translation[0] - catX, camT.translation[2] - catZ);
    const roll = Math.sin(performance.now() * 0.04) * urgency * 0.16;
    const halfYaw = facingAngle / 2;
    const halfRoll = roll / 2;
    heldCat.transform.rotation = [
        Math.sin(halfYaw) * Math.sin(halfRoll),
        Math.sin(halfYaw) * Math.cos(halfRoll),
        Math.cos(halfYaw) * Math.sin(halfRoll),
        Math.cos(halfYaw) * Math.cos(halfRoll),
    ];
    const restlessScale = 1.8 + Math.sin(performance.now() * 0.03) * urgency * 0.08;
    heldCat.transform.scale = [restlessScale, restlessScale, restlessScale];
}

function dropHeldCat() {
    const camT = camera.getComponentOfType(Transform);
    const dropZone = dropZones[heldCat.dropZoneIndex];
    const [dropX, dropZ] = dropZone.position;
    const dx = camT.translation[0] - dropX;
    const dz = camT.translation[2] - dropZ;
    if (dx * dx + dz * dz > DROP_ZONE_RADIUS * DROP_ZONE_RADIUS) {
        setStatus('Mačko odnesi do njenega oranžnega polja.', [220, 0.1, 'sine']);
        return;
    }

    heldCat.transform.translation[0] = dropX;
    heldCat.transform.translation[1] = heldCat.baseY;
    heldCat.transform.translation[2] = dropZ;
    heldCat.transform.rotation = [...heldCat.originalRotation];
    heldCat.transform.scale = [1.2, 1.2, 1.2];
    heldCat.state = 'placed';
    dropZone.occupied = true;
    setDropZoneColor(dropZone, [0.2, 1, 0.2]);
    setStatus('Mačka je varno odložena!', [1040, 0.16, 'triangle']);
    if (heldCat.partner) heldCat.partner.followHeld = false;
    heldCat = null;
    holdTimeRemaining = 0;
    updateHoldTimer();

    caughtCats++;
    updateCounter();
    if (caughtCats === totalCats) {
        gameState = 'ended';
        endOverlay.style.display = 'flex';
        setStatus('Našel si vse mačke!', [1200, 0.25, 'triangle']);
    }
}

function tryCatchCat() {
    if (gameState !== 'playing') return;

    if (heldCat) {
        dropHeldCat();
        return;
    }

    // E ima več funkcij, zato najprej preverimo predmet, nato hrano in šele potem mačko.
    if (tryCleanNearbyProp()) return;
    if (tryCollectFood()) return;

    const camT = camera.getComponentOfType(Transform);
    const p = camT.translation;
    let caughtCat = false;

    for (const cat of cats) {
        if (cat.state !== 'free') continue;

        const cp = cat.transform.translation;
        const dx = p[0] - cp[0];
        const dy = p[1] - cp[1];
        const dz = p[2] - cp[2];
        const distSq = dx * dx + dy * dy + dz * dz;
        const catchRadiusSq = cat.tangledTime > 0 ? 9.0 : 4.0;

        if (distSq < catchRadiusSq) {
            cat.state = 'held';
            heldCat = cat;
            catAttractionActive = false;
            cat.angryTime = 0;
            cat.missedAttempts = 0;
            cat.attackTime = 0;
            firstPersonController.maxSpeed = 5;
            caughtCat = true;
            if (cat.partner?.state === 'free') {
                cat.partner.followHeld = true;
            }
            cat.collider.enabled = false;
            setDropZoneColor(dropZones[cat.dropZoneIndex], [2, 2, 0.15]);
            holdTimeRemaining = cat.holdTimeLimit;
            updateHoldTimer();
            updateHeldCat();
            setStatus('Mačko držiš. Pohiti do njenega polja!', [880, 0.14, 'triangle']);
            break;
        }
    }

    if (caughtCat) return;

    const nearbyCat = cats
        .filter(cat => cat.state === 'free')
        .sort((a, b) => {
            const distanceA = Math.hypot(a.transform.translation[0] - p[0], a.transform.translation[2] - p[2]);
            const distanceB = Math.hypot(b.transform.translation[0] - p[0], b.transform.translation[2] - p[2]);
            return distanceA - distanceB;
        })[0];

    if (nearbyCat) {
        const distance = Math.hypot(nearbyCat.transform.translation[0] - p[0], nearbyCat.transform.translation[2] - p[2]);
        if (distance < 7) {
            nearbyCat.missedAttempts++;
            if (nearbyCat.missedAttempts >= 3) {
                nearbyCat.angryTime = 10;
                nearbyCat.missedAttempts = 0;
                setStatus('Jezna mačka te upočasnjuje!', [100, 0.25, 'sawtooth']);
            }
        }
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') {
        tryCatchCat();
    }
    if (e.code === 'KeyL' && gameState === 'playing') {
        laserActive = !laserActive;
        for (const cat of cats) {
            cat.laserIgnoreTime = cat.id % 3 === 0 && laserActive ? 3 : 0;
        }
        setStatus(laserActive ? 'Laserski kazalec je vklopljen.' : 'Laserski kazalec je izklopljen.', [laserActive ? 740 : 300, 0.1, 'sine']);
    }
});

// =========================
//  UPDATE / RENDER SISTEMI
// =========================
function update(time, dt) {
    const isCrouching = firstPersonController.keys['ControlLeft'] || firstPersonController.keys['ControlRight'];
    const isSprinting = firstPersonController.keys['ShiftLeft'] || firstPersonController.keys['ShiftRight'];
    const angryCatActive = cats.some(cat => cat.angryTime > 0);
    const attackingCatActive = cats.some(cat => cat.attackTime > 0);
    const requestedSpeed = isCrouching ? 2.2 : isSprinting ? 8 : 5;
    firstPersonController.isCrouching = isCrouching;
    firstPersonController.isSprinting = isSprinting;
    firstPersonController.maxSpeed = attackingCatActive
        ? Math.min(requestedSpeed, 1.8)
        : angryCatActive
            ? Math.min(requestedSpeed, 2.5)
            : requestedSpeed;

    // tudi med start/end screenom posodabljamo light animator,
    // ampak gameplay logiko izvajamo samo v 'playing'
    for (const entity of scene) {
        for (const component of entity.components) {
            component.update?.(time, dt);
        }
    }

    if (gameState !== 'playing') {
        return;
    }

    if (heldCat) {
        holdTimeRemaining -= dt;
        if (holdTimeRemaining <= 0) {
            releaseHeldCat();
        } else {
            updateHoldTimer();
        }
    }

    const camT = camera.getComponentOfType(Transform);
    const pos = camT.translation;

    const margin = 0.5;
    const limitX = ROOM_HALF_SIZE - margin;
    const limitZ = ROOM_HALF_SIZE - margin;

    if (pos[0] > limitX) pos[0] = limitX;
    if (pos[0] < -limitX) pos[0] = -limitX;
    if (pos[2] > limitZ) pos[2] = limitZ;
    if (pos[2] < -limitZ) pos[2] = -limitZ;

    const lookDirection = getLookDirection();
    updateLaserPoint(camT);

    if (isChargingJump && isGrounded) {
        jumpCharge += dt;
    }

    verticalVelocity += GRAVITY * dt;
    pos[1] += verticalVelocity * dt;

    let onGroundThisFrame = false;

    const playerGroundHeight = isCrouching ? CROUCH_HEIGHT : GROUND_HEIGHT;
    if (pos[1] <= playerGroundHeight) {
        pos[1] = playerGroundHeight;
        if (verticalVelocity < 0) verticalVelocity = 0;
        onGroundThisFrame = true;
    }

    const ceilingLimit = ROOM_HEIGHT - 0.3;
    if (pos[1] > ceilingLimit) {
        pos[1] = ceilingLimit;
        if (verticalVelocity > 0) verticalVelocity = 0;
    }

    const camRadius = 0.5;

    for (const col of colliders) {
        if (!col.enabled) continue;

        const t = col.transform;
        const cPos = t.translation;
        const halfSize = col.halfSize ?? t.scale;

        const halfX = halfSize[0] + camRadius;
        const halfY = halfSize[1] + camRadius;
        const halfZ = halfSize[2] + camRadius;

        const minX = cPos[0] - halfX;
        const maxX = cPos[0] + halfX;
        const minY = cPos[1] - halfY;
        const maxY = cPos[1] + halfY;
        const minZ = cPos[2] - halfZ;
        const maxZ = cPos[2] + halfZ;

        const insideX = pos[0] > minX && pos[0] < maxX;
        const insideY = pos[1] > minY && pos[1] < maxY;
        const insideZ = pos[2] > minZ && pos[2] < maxZ;

        if (insideX && insideY && insideZ) {
            const dx1 = maxX - pos[0];
            const dx2 = pos[0] - minX;
            const px = Math.min(dx1, dx2);

            const dy1 = maxY - pos[1];
            const dy2 = pos[1] - minY;
            const py = Math.min(dy1, dy2);

            const dz1 = maxZ - pos[2];
            const dz2 = pos[2] - minZ;
            const pz = Math.min(dz1, dz2);

            let minPen = px;
            let axis = 'x';

            if (py < minPen) {
                minPen = py;
                axis = 'y';
            }
            if (pz < minPen) {
                minPen = pz;
                axis = 'z';
            }

            const EPS = 0.0001;

            if (axis === 'x') {
                if (pos[0] > cPos[0]) pos[0] = maxX + EPS;
                else                  pos[0] = minX - EPS;
            } else if (axis === 'y') {
                if (pos[1] > cPos[1]) {
                    pos[1] = maxY + EPS;
                    if (verticalVelocity < 0) verticalVelocity = 0;
                    onGroundThisFrame = true;
                } else {
                    pos[1] = minY - EPS;
                    if (verticalVelocity > 0) verticalVelocity = 0;
                }
            } else if (axis === 'z') {
                if (pos[2] > cPos[2]) pos[2] = maxZ + EPS;
                else                  pos[2] = minZ - EPS;
            }
        }
    }

    isGrounded = onGroundThisFrame;
    if (isGrounded && verticalVelocity < 0) {
        verticalVelocity = 0;
    }

    // gibanje mačk
    for (const cat of cats) {
        if (cat.state !== 'free') continue;

        if (cat.hidden) {
            if (cat.hideTime > 0) {
                cat.hideTime -= dt;
                if (cat.hideTime <= 0) {
                    cat.hidden = false;
                    if (!scene.includes(cat.entity)) scene.push(cat.entity);
                }
            }
            continue;
        }

        const t = cat.transform;
        const p = t.translation;

        if (cat.tangledTime > 0) {
            cat.tangledTime -= dt;
            continue;
        }

        teleportCatIfUnseen(cat, pos, lookDirection, dt);
        if (cat.laserIgnoreTime > 0) cat.laserIgnoreTime -= dt;
        if (cat.angryTime > 0) cat.angryTime -= dt;
        if (cat.attackCooldown > 0) cat.attackCooldown -= dt;
        if (cat.attackTime > 0) cat.attackTime -= dt;
        if (cat.jumpTime > 0) cat.jumpTime -= dt;
        cat.aiTimer -= dt;
        if (cat.aiTimer <= 0) {
            chooseCatAIState(cat, pos, {
                catAttractionActive,
                laserActive,
                foodItems,
                interactiveProps,
                playerSprinting: isSprinting,
                playerCrouching: isCrouching,
            });
        }

        if (cat.aiState === 'idle') {
            cat.tParam += dt;
            continue;
        }

        if (cat.fleeTime > 0) {
            const previousX = p[0];
            const previousZ = p[2];
            const awayX = p[0] - pos[0];
            const awayZ = p[2] - pos[2];
            const awayLength = Math.hypot(awayX, awayZ) || 1;
            cat.fleeDirection[0] = awayX / awayLength;
            cat.fleeDirection[1] = awayZ / awayLength;
            p[0] += cat.fleeDirection[0] * cat.fleeSpeed * dt;
            p[2] += cat.fleeDirection[1] * cat.fleeSpeed * dt;
            p[0] = Math.min(Math.max(p[0], -ROOM_HALF_SIZE + 1), ROOM_HALF_SIZE - 1);
            p[2] = Math.min(Math.max(p[2], -ROOM_HALF_SIZE + 1), ROOM_HALF_SIZE - 1);
            p[1] = cat.baseY;
            if (catPositionBlocked(p[0], p[2])) {
                p[0] = previousX;
                p[2] = previousZ;
                cat.fleeDirection[0] *= -1;
                cat.fleeDirection[1] *= -1;
            }
            cat.fleeTime -= dt;
            cat.tParam += dt;
            continue;
        }

        if (cat.detourTime > 0) {
            const previousX = p[0];
            const previousZ = p[2];
            const detourSpeed = Math.max(cat.speed || 2, 2.4);
            p[0] += cat.detourDirection[0] * detourSpeed * dt;
            p[2] += cat.detourDirection[1] * detourSpeed * dt;
            keepCatInsideRoom(cat, previousX, previousZ);
            cat.detourTime -= dt;
            cat.tParam += dt;
            continue;
        }

        const previousX = p[0];
        const previousZ = p[2];
        cat.tParam += dt;

        switch (cat.type) {
            case 'lineX': {
                p[0] += cat.dir * cat.speed * dt;
                if (p[0] > cat.maxX) {
                    p[0] = cat.maxX;
                    cat.dir = -1;
                } else if (p[0] < cat.minX) {
                    p[0] = cat.minX;
                    cat.dir = 1;
                }
                break;
            }
            case 'lineZ': {
                p[2] += cat.dir * cat.speed * dt;
                if (p[2] > cat.maxZ) {
                    p[2] = cat.maxZ;
                    cat.dir = -1;
                } else if (p[2] < cat.minZ) {
                    p[2] = cat.minZ;
                    cat.dir = 1;
                }
                break;
            }
            case 'circle': {
                const angle = cat.tParam * cat.angularSpeed;
                p[0] = cat.center[0] + Math.cos(angle) * cat.radius;
                p[2] = cat.center[1] + Math.sin(angle) * cat.radius;
                p[1] = cat.baseY;
                break;
            }
            case 'diag': {
                p[0] += cat.dirX * cat.speed * dt;
                p[2] += cat.dirZ * cat.speed * dt;

                if (p[0] > cat.maxX) {
                    p[0] = cat.maxX;
                    cat.dirX = -1;
                } else if (p[0] < cat.minX) {
                    p[0] = cat.minX;
                    cat.dirX = 1;
                }

                if (p[2] > cat.maxZ) {
                    p[2] = cat.maxZ;
                    cat.dirZ = -1;
                } else if (p[2] < cat.minZ) {
                    p[2] = cat.minZ;
                    cat.dirZ = 1;
                }
                break;
            }
            case 'jump': {
                const angle = cat.tParam * cat.angularSpeed;
                const cx = cat.circleCenter[0];
                const cz = cat.circleCenter[1];
                p[0] = cx + Math.cos(angle) * cat.circleRadius;
                p[2] = cz + Math.sin(angle) * cat.circleRadius;
                p[1] = cat.baseY;
                break;
            }
        }

        p[1] = cat.aiState === 'jump'
            ? cat.baseY + Math.abs(Math.sin((cat.jumpTime ?? 0) * 12)) * 1.2
            : cat.baseY;
        knockNearbyProp(p);
        const behavior = getCatBehavior(cat, pos, laserPointTransform.translation, {
            catAttractionActive,
            foodItems,
            interactiveProps,
        });

        const behaviorX = behavior.targetX - p[0];
        const behaviorZ = behavior.targetZ - p[2];
        const behaviorDistance = Math.hypot(behaviorX, behaviorZ) || 1;

        p[0] += behavior.direction * behaviorX / behaviorDistance * behavior.speed * dt;
        p[2] += behavior.direction * behaviorZ / behaviorDistance * behavior.speed * dt;
        keepCatInsideRoom(cat, previousX, previousZ);

        if (cat.aiState === 'hide' &&
            Math.hypot(behavior.targetX - p[0], behavior.targetZ - p[2]) < 1.6) {
            cat.hidden = true;
            cat.hideTime = 3;
            const sceneIndex = scene.indexOf(cat.entity);
            if (sceneIndex !== -1) scene.splice(sceneIndex, 1);
            setStatus('Mačka se je skrila. Poišči jo!', [160, 0.16, 'sine']);
            continue;
        }

        const movedX = p[0] - previousX;
        const movedZ = p[2] - previousZ;
        faceCatToMovement(cat, movedX, movedZ);
    }

    updateHeldCat();

    camT.translation = pos;
}

function render() {
    renderer.render(scene, camera);
}

function resize({ displaySize: { width, height } }) {
    camera.getComponentOfType(Camera).aspect = width / height;
}

new ResizeSystem({ canvas, resize }).start();
new UpdateSystem({ update, render }).start();
