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

// --- START SCREEN ---
const startOverlay = document.createElement('div');
startOverlay.style.position = 'fixed';
startOverlay.style.inset = '0';
startOverlay.style.background = 'rgba(0,0,0,0.8)';
startOverlay.style.display = 'flex';
startOverlay.style.flexDirection = 'column';
startOverlay.style.alignItems = 'center';
startOverlay.style.justifyContent = 'center';
startOverlay.style.color = 'white';
startOverlay.style.fontFamily = 'system-ui, sans-serif';
startOverlay.style.zIndex = '30';

const startTitle = document.createElement('h1');
startTitle.textContent = 'Cat Catcher';
startTitle.style.marginBottom = '16px';

const startText = document.createElement('p');
startText.textContent = 'Ujemi vse mačke z tipko E (WASD + miška za premikanje).';
startText.style.marginBottom = '20px';

const startButton = document.createElement('button');
startButton.textContent = 'Start game';
startButton.style.padding = '10px 22px';
startButton.style.fontSize = '16px';
startButton.style.cursor = 'pointer';
startButton.style.borderRadius = '6px';
startButton.style.border = 'none';

startOverlay.appendChild(startTitle);
startOverlay.appendChild(startText);
startOverlay.appendChild(startButton);
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

if (cameraTransform) {
    cameraTransform.translation = [0, GROUND_HEIGHT, 12];
}

camera.addComponent(new FirstPersonController(camera, canvas, {
    pitch: 0,
    yaw: 0,
    maxSpeed: 5,
    acceleration: 20,
    decay: 0.92,
}));

const monkeyIndex = scene.findIndex(entity => entity.getComponentOfType(Model));
if (monkeyIndex !== -1) {
    scene.splice(monkeyIndex, 1);
}

// =========================
//  LUČ NAD SOB0
// =========================
const light = new Entity();
const ROOM_HALF_SIZE = 15;
const ROOM_HEIGHT = 8;

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

// =========================
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

function createCubeModel(material) {
    const primitive = new Primitive({
        mesh: cubeMesh,
        material,
    });
    return new Model({
        primitives: [primitive],
    });
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
        if (gameState === 'playing' && isGrounded && !isChargingJump) {
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

const backWall = new Entity();
backWall.addComponent(new Transform({
    translation: [0, ROOM_HEIGHT / 2, ROOM_HALF_SIZE],
    rotation: [0, 0, 0, 1],
    scale: [ROOM_HALF_SIZE, ROOM_HEIGHT / 2, 0.5],
}));
backWall.addComponent(createCubeModel(wallFloorMaterial));
scene.push(backWall);

const leftWall = new Entity();
leftWall.addComponent(new Transform({
    translation: [-ROOM_HALF_SIZE, ROOM_HEIGHT / 2, 0],
    rotation: [0, 0, 0, 1],
    scale: [0.5, ROOM_HEIGHT / 2, ROOM_HALF_SIZE],
}));
leftWall.addComponent(createCubeModel(wallFloorMaterial));
scene.push(leftWall);

const rightWall = new Entity();
rightWall.addComponent(new Transform({
    translation: [ROOM_HALF_SIZE, ROOM_HEIGHT / 2, 0],
    rotation: [0, 0, 0, 1],
    scale: [0.5, ROOM_HEIGHT / 2, ROOM_HALF_SIZE],
}));
rightWall.addComponent(createCubeModel(wallFloorMaterial));
scene.push(rightWall);

// =========================
//  KOLIDERJI (samo mačke)
// =========================
const colliders = [];

// =========================
//  MAČKE – RAZLIČNA GIBANJA
// =========================
const CAT_URL = new URL('./models/cat/cat.gltf', import.meta.url);

const cats = []; // { entity, transform, collider, alive, type, ... }

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
        enabled: true,
    };
    colliders.push(collider);

    const cat = {
        entity: catEntity,
        transform: t,
        collider,
        alive: true,
        dir: 1,
        tParam: 0,
        baseY: startPos[1],
    };

    setupFn(cat);
    cats.push(cat);

    totalCats++;
    updateCounter();
}

// 5 različnih mačk
await spawnCat([-10, 1, -5], (cat) => {
    cat.type = 'lineX';
    cat.minX = -10;
    cat.maxX = -2;
    cat.speed = 2.0;
});

await spawnCat([8, 1, -10], (cat) => {
    cat.type = 'lineZ';
    cat.minZ = -10;
    cat.maxZ = 0;
    cat.speed = 1.8;
});

await spawnCat([6, 1, 0], (cat) => {
    cat.type = 'circle';
    cat.center = [0, 0];
    cat.radius = 6;
    cat.angularSpeed = 0.8;
});

await spawnCat([-8, 1, 8], (cat) => {
    cat.type = 'diag';
    cat.minX = -12;
    cat.maxX = -2;
    cat.minZ = 4;
    cat.maxZ = 10;
    cat.speed = 2.2;
    cat.dirX = 1;
    cat.dirZ = -1;
});

await spawnCat([0, 1, 8], (cat) => {
    cat.type = 'jump';
    cat.circleCenter = [0, 8];
    cat.circleRadius = 2.5;
    cat.angularSpeed = 1.2;
    cat.jumpSpeed = 3.0;
});

// =========================
//  ULOV MAČKE S TIPKO E
// =========================
function tryCatchCat() {
    if (gameState !== 'playing') return;

    const camT = camera.getComponentOfType(Transform);
    const p = camT.translation;
    const catchRadiusSq = 4.0;

    for (const cat of cats) {
        if (!cat.alive) continue;

        const cp = cat.transform.translation;
        const dx = p[0] - cp[0];
        const dy = p[1] - cp[1];
        const dz = p[2] - cp[2];
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < catchRadiusSq) {
            cat.alive = false;
            cat.collider.enabled = false;

            const idx = scene.indexOf(cat.entity);
            if (idx !== -1) {
                scene.splice(idx, 1);
            }

            caughtCats++;
            updateCounter();
            console.log('Ujel si mačko!');

            if (caughtCats === totalCats) {
                gameState = 'ended';
                endOverlay.style.display = 'flex';
            }
            break;
        }
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') {
        tryCatchCat();
    }
});

// =========================
//  UPDATE / RENDER SISTEMI
// =========================
function update(time, dt) {
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

    const camT = camera.getComponentOfType(Transform);
    const pos = camT.translation;

    const margin = 0.5;
    const limitX = ROOM_HALF_SIZE - margin;
    const limitZ = ROOM_HALF_SIZE - margin;

    if (pos[0] > limitX) pos[0] = limitX;
    if (pos[0] < -limitX) pos[0] = -limitX;
    if (pos[2] > limitZ) pos[2] = limitZ;
    if (pos[2] < -limitZ) pos[2] = -limitZ;

    if (isChargingJump && isGrounded) {
        jumpCharge += dt;
    }

    verticalVelocity += GRAVITY * dt;
    pos[1] += verticalVelocity * dt;

    let onGroundThisFrame = false;

    if (pos[1] <= GROUND_HEIGHT) {
        pos[1] = GROUND_HEIGHT;
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
        const cScale = t.scale;

        const halfX = cScale[0] + camRadius;
        const halfY = cScale[1] + camRadius;
        const halfZ = cScale[2] + camRadius;

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
        if (!cat.alive) continue;

        const t = cat.transform;
        const p = t.translation;
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
                p[1] = cat.baseY + Math.abs(Math.sin(cat.tParam * cat.jumpSpeed)) * 2.0;
                break;
            }
        }
    }

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
