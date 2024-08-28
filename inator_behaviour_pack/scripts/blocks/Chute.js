import { world, system, BlockPermutation } from '@minecraft/server';

const updateChuteState = function(block, updateNeighbors=true, updateSelf=true) {
    const blockState = {
        "inator:up": false,
        "inator:down": false,
        "inator:north": false,
        "inator:south": false,
        "inator:east": false,
        "inator:west": false
    }

    const directions = [
        { neighbor: block.above(), blockStateKey: "inator:up" },
        { neighbor: block.below(), blockStateKey: "inator:down" },
        { neighbor: block.north(), blockStateKey: "inator:north" },
        { neighbor: block.south(), blockStateKey: "inator:south" },
        { neighbor: block.east(), blockStateKey: "inator:east" },
        { neighbor: block.west(), blockStateKey: "inator:west" },
    ];

    // Normal states and update neighbors
    for (let i = 0; i < directions.length; i++) {
        const direction = directions[i];
        if (direction.neighbor.typeId === "inator:chute") {
            blockState[direction.blockStateKey] = true;
            if (updateNeighbors) {
                updateChuteState(direction.neighbor, false);
            }
        }
    }

    if (!updateSelf) {
        return;
    }

    // Straight chutes
    let totalTrueSides = 0;
    directions.forEach(d => totalTrueSides += blockState[d.blockStateKey]);

    if (totalTrueSides == 0) {
        blockState["inator:up"] = true;
        blockState["inator:down"] = true;
    } else if (totalTrueSides <= 2) {
        // Warning: cursed JS
        for (let i = 0; i < directions.length; i += 2) {
            // If any in consecutive direction pair is true and all else is false, both of the pair should be true
            const sum = blockState[directions[i].blockStateKey] + blockState[directions[i+1].blockStateKey]
            if (sum == totalTrueSides) {
                blockState[directions[i].blockStateKey] = true;
                blockState[directions[i+1].blockStateKey] = true;
                break;
            }
        }
    }

    // Apply
    const permutation = BlockPermutation.resolve("inator:chute", blockState);
    block.setPermutation(permutation);
}

world.afterEvents.playerPlaceBlock.subscribe(event => {
    if (event.block.typeId === 'inator:chute') {
        system.run(() => {
            updateChuteState(event.block);
        });
    }
});

world.beforeEvents.playerBreakBlock.subscribe(event => {
    if (event.block.typeId === 'inator:chute') {
        system.run(() => {
            updateChuteState(event.block, true, false);
        });
    }
});