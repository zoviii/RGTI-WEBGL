// Tukaj so pravila vedenja mačk ločena od glavne scene, da je main.js bolj pregleden.
export function chooseCatAIState(cat, playerPosition, {
    catAttractionActive,
    laserActive,
    foodItems,
    interactiveProps,
    playerSprinting,
    playerCrouching,
}) {
    const catPosition = cat.transform.translation;
    const distanceToPlayer = Math.hypot(
        catPosition[0] - playerPosition[0],
        catPosition[2] - playerPosition[2],
    );

    // Najprej preverim posebna stanja, ker imajo prednost pred navadnim sprehajanjem.
    if (cat.attackTime > 0) {
        cat.aiState = 'attack';
        cat.aiTimer = 0.3;
    } else if (cat.angryTime > 0) {
        cat.aiState = 'angry';
        cat.aiTimer = 0.5;
    } else if (catAttractionActive) {
        cat.aiState = 'approach';
        cat.aiTimer = 0.5;
    } else if (cat.followHeld) {
        cat.aiState = 'follow';
        cat.aiTimer = 0.5;
    } else if (laserActive && cat.laserIgnoreTime <= 0) {
        cat.aiState = 'laser';
        cat.aiTimer = 0.5;
    } else if (cat.personality === 'cautious' && distanceToPlayer < 9 && (playerSprinting || !playerCrouching)) {
        cat.aiState = 'flee';
        cat.aiTimer = 0.35;
    } else if (cat.canAttack && cat.attackCooldown <= 0 && distanceToPlayer < 5 && Math.random() < 0.12) {
        cat.aiState = 'attack';
        cat.attackTime = 1.5;
        cat.attackCooldown = 5 + Math.random() * 4;
        cat.aiTimer = 0.3;
    } else if (cat.canHide && Math.random() < 0.04) {
        cat.aiState = 'hide';
        cat.aiTimer = 2.5;
    } else if (cat.canJump && Math.random() < 0.04) {
        cat.aiState = 'jump';
        cat.jumpTime = 0.9;
        cat.aiTimer = 0.9;
    } else if (cat.canZoom && Math.random() < 0.08) {
        cat.aiState = 'zoom';
        cat.aiTimer = 0.8 + Math.random() * 0.8;
    } else if (distanceToPlayer < 7) {
        cat.aiState = 'flee';
        cat.aiTimer = 0.6;
    } else if (cat.destructive && interactiveProps.some(prop => !prop.knocked)) {
        cat.aiState = 'seekProp';
        cat.aiTimer = 0.6;
    } else if (cat.playful && Math.random() < 0.18) {
        cat.aiState = 'playful';
        cat.aiTimer = 1 + Math.random() * 1.5;
    } else if (interactiveProps.some(prop => !prop.knocked) && Math.random() < 0.2) {
        cat.aiState = 'seekProp';
        cat.aiTimer = 2 + Math.random() * 2;
    } else if (foodItems.some(food => !food.collected) && Math.random() < 0.25) {
        cat.aiState = 'seekFood';
        cat.aiTimer = 2 + Math.random() * 3;
    } else if (cat.aiState === 'wander' && Math.random() < 0.12) {
        cat.aiState = 'idle';
        cat.aiTimer = 0.8 + Math.random() * 1.8;
    } else if (cat.aiState === 'idle') {
        cat.aiState = 'wander';
        cat.aiTimer = 1.5 + Math.random() * 2.5;
    } else {
        cat.aiState = 'wander';
        cat.aiTimer = 1.5 + Math.random() * 2.5;
    }

    const angle = Math.random() * Math.PI * 2;
    cat.aiDirection = [Math.cos(angle), Math.sin(angle)];
}

export function getCatBehavior(cat, playerPosition, laserPosition, {
    catAttractionActive,
    foodItems,
    interactiveProps,
}) {
    // Funkcija vrne cilj, smer in hitrost, ki jih potem uporabi update zanka.
    let targetX = playerPosition[0];
    let targetZ = playerPosition[2];
    let direction = cat.aiState === 'flee' ? -1 : 1;
    let speed = cat.aiState === 'attack' ? 4 : cat.aiState === 'angry' ? 3.2 : cat.aiState === 'flee' ? 2.4 : 1.4;

    if (cat.aiState === 'wander') {
        direction = 0;
    }

    if (cat.aiState === 'seekFood') {
        const catPosition = cat.transform.translation;
        const nearestFood = foodItems
            .filter(food => !food.collected)
            .sort((a, b) => {
                const distanceA = Math.hypot(
                    a.transform.translation[0] - catPosition[0],
                    a.transform.translation[2] - catPosition[2],
                );
                const distanceB = Math.hypot(
                    b.transform.translation[0] - catPosition[0],
                    b.transform.translation[2] - catPosition[2],
                );
                return distanceA - distanceB;
            })[0];

        if (nearestFood) {
            targetX = nearestFood.transform.translation[0];
            targetZ = nearestFood.transform.translation[2];
            speed = 1.8;
        }
    }

    if (cat.aiState === 'seekProp') {
        const catPosition = cat.transform.translation;
        const nearestProp = interactiveProps
            .filter(prop => !prop.knocked)
            .sort((a, b) => {
                const distanceA = Math.hypot(
                    a.transform.translation[0] - catPosition[0],
                    a.transform.translation[2] - catPosition[2],
                );
                const distanceB = Math.hypot(
                    b.transform.translation[0] - catPosition[0],
                    b.transform.translation[2] - catPosition[2],
                );
                return distanceA - distanceB;
            })[0];

        if (nearestProp) {
            targetX = nearestProp.transform.translation[0];
            targetZ = nearestProp.transform.translation[2];
            speed = 2.2;
        }
    }

    // Zoomies so samo kratek naključen izbruh hitrosti v novo smer.
    if (cat.aiState === 'playful') {
        const catPosition = cat.transform.translation;
        targetX = catPosition[0] + cat.aiDirection[0] * 5;
        targetZ = catPosition[2] + cat.aiDirection[1] * 5;
        speed = 2.8;
    }

    if (cat.aiState === 'zoom') {
        targetX = cat.transform.translation[0] + cat.aiDirection[0] * 8;
        targetZ = cat.transform.translation[2] + cat.aiDirection[1] * 8;
        speed = 6;
    }

    if (cat.aiState === 'jump') {
        targetX = cat.transform.translation[0] + cat.aiDirection[0] * 3;
        targetZ = cat.transform.translation[2] + cat.aiDirection[1] * 3;
        speed = 2.2;
    }

    if (cat.aiState === 'hide') {
        const hidingSpots = [
            [-17, -17], [17, 15], [-17, 17],
            [-18, 18], [18, -18], [-18, 6], [18, -6], [6, 18],
        ];
        const [hideX, hideZ] = hidingSpots[cat.id % hidingSpots.length];
        targetX = hideX;
        targetZ = hideZ;
        speed = 2;
    }

    if (cat.destructive && cat.aiState === 'seekProp') {
        speed = 3;
    }

    if (cat.aiState === 'approach' || cat.aiState === 'follow') {
        speed = 2.5;
    }

    if (cat.aiState === 'laser') {
        targetX = laserPosition[0];
        targetZ = laserPosition[2];
        speed = 3;
    }

    if (catAttractionActive) {
        direction = 1;
        speed = 2.5;
    }

    return { targetX, targetZ, direction, speed };
}

export function faceCatToMovement(cat, movementX, movementZ) {
    if (Math.hypot(movementX, movementZ) <= 0.001) return;

    const facingAngle = Math.atan2(movementX, movementZ);
    cat.transform.rotation = [
        0,
        Math.sin(facingAngle / 2),
        0,
        Math.cos(facingAngle / 2),
    ];
}
