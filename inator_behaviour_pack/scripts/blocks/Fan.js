import { world, system, BlockPermutation, MolangVariableMap } from '@minecraft/server';

const fanRange = 8; // Fan will affect entities 8 blocks away
const fanPushForce = 0.1;

const directionOffsets = {
    "up": {x: 0, y:1, z:0},
    "down": {x: 0, y:-1, z:0},
    "north": {x: 0, y:0, z:-1},
    "east": {x: 1, y:0, z:0},
    "south": {x: 0, y:0, z:1},
    "west": {x: -1, y:0, z:0},
}

const toggleFanState = function(block) {
    const blockState = {
        "minecraft:facing_direction": block.permutation.getState("minecraft:facing_direction"),
        "inator:on": !block.permutation.getState("inator:on")
    }
    const permutation = BlockPermutation.resolve("inator:fan", blockState);
    block.setPermutation(permutation);
}

const onFanTick = function(block) {
    if (!block.permutation.getState("inator:on"))
        return;

    
    const dimension = world.getDimension("overworld");
    const facingDirection = block.permutation.getState("minecraft:facing_direction");
    const directionX = directionOffsets[facingDirection].x;
    const directionY = directionOffsets[facingDirection].y;
    const directionZ = directionOffsets[facingDirection].z;
    const frontLocation = {x:block.x + directionX, y:block.y + directionY, z:block.z+directionZ};

    // Emit particles
    const particleVariableMap = new MolangVariableMap();
    particleVariableMap.setVector3("direction", {x:directionX,y:directionY,z:directionZ});
    dimension.spawnParticle("inator:fan_dust", {x:frontLocation.x+0.5, y:frontLocation.y+0.5, z:frontLocation.z+0.5}, particleVariableMap);


    // Get entities in front of block
    const entities = [];

    
    for (let i = 1; i <= fanRange; i++) {
        const location = {x:block.x, y:block.y, z:block.z};
        location.x += directionX * i;
        location.y += directionY * i;
        location.z += directionZ * i;

        // Another potential option is dimension.getEntitiesFromRay(rayStart, rayEnd), but it did not work in my testing
        const entitiesAtLocation = dimension.getEntitiesAtBlockLocation(location);
        entitiesAtLocation.forEach(e => entities.push(e));
    }

    // Apply force to each entity found
    entities.forEach(entity => {
        entity.extinguishFire();

        if (entity.typeId === "minecraft:player"){
            entity.applyKnockback(directionX, directionZ, fanPushForce, directionY * fanPushForce);
        } else {
            const force = {x:directionX*fanPushForce, y:directionY*fanPushForce, z:directionZ*fanPushForce};
            entity.applyImpulse(force);
        }
    });
}

world.beforeEvents.worldInitialize.subscribe(initEvent => {
    initEvent.blockComponentRegistry.registerCustomComponent('inator:fan_component', {
        onPlayerInteract: e => {toggleFanState(e.block)},
        onTick: e => {onFanTick(e.block)}
    });
});