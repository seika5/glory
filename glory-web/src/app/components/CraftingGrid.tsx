'use client';

import { useState } from 'react';

interface Material {
  id: string;
  name: string;
  description: string;
  level: number;
}

interface GridSlot {
  material: Material | null;
  isEmpty: boolean;
}

interface CraftingGridProps {
  inventory: {material: Material, quantity: number}[];
  onCraft: (grid: (string | null)[][], weaponType: string) => Promise<void>;
}

const WEAPON_TYPES = [
  'bows', 'cannons', 'daggers', 'gauntlets', 'handguns',
  'rifles', 'spears', 'staves', 'swords'
];

export default function CraftingGrid({ inventory, onCraft }: CraftingGridProps) {
  const [grid, setGrid] = useState<GridSlot[][]>(
    Array(9).fill(null).map(() => 
      Array(9).fill(null).map(() => ({ material: null, isEmpty: true }))
    )
  );
  const [selectedWeaponType, setSelectedWeaponType] = useState<string>('bows');
  const [draggedMaterial, setDraggedMaterial] = useState<Material | null>(null);
  const [usedMaterials, setUsedMaterials] = useState<{ [materialId: string]: number }>({});

  const handleDragStart = (material: Material) => {
    setDraggedMaterial(material);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    if (draggedMaterial && grid[row][col].isEmpty) {
      // Check if we have enough of this material (inventory - used)
      const inventoryItem = inventory.find(item => item.material.id === draggedMaterial.id);
      const usedCount = usedMaterials[draggedMaterial.id] || 0;
      const availableCount = inventoryItem ? inventoryItem.quantity - usedCount : 0;
      
      if (availableCount > 0) {
        const newGrid = [...grid];
        newGrid[row][col] = { material: draggedMaterial, isEmpty: false };
        setGrid(newGrid);
        
        // Update used materials count
        setUsedMaterials(prev => ({
          ...prev,
          [draggedMaterial.id]: (prev[draggedMaterial.id] || 0) + 1
        }));
      }
      setDraggedMaterial(null);
    }
  };

  const handleSlotClick = (row: number, col: number) => {
    if (!grid[row][col].isEmpty) {
      const removedMaterial = grid[row][col].material;
      const newGrid = [...grid];
      newGrid[row][col] = { material: null, isEmpty: true };
      setGrid(newGrid);
      
      // Return material to available pool
      if (removedMaterial) {
        setUsedMaterials(prev => ({
          ...prev,
          [removedMaterial.id]: Math.max(0, (prev[removedMaterial.id] || 0) - 1)
        }));
      }
    }
  };

  const getMaterialsOnGrid = (): Material[] => {
    const materials: Material[] = [];
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (!grid[row][col].isEmpty && grid[row][col].material) {
          materials.push(grid[row][col].material!);
        }
      }
    }
    return materials;
  };

  const isConnected = (): boolean => {
    const materials = getMaterialsOnGrid();
    if (materials.length === 0) return false;

    // Find all occupied positions
    const occupiedPositions: [number, number][] = [];
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (!grid[row][col].isEmpty) {
          occupiedPositions.push([row, col]);
        }
      }
    }

    if (occupiedPositions.length === 0) return false;

    // BFS to check connectivity
    const visited = new Set<string>();
    const queue: [number, number][] = [occupiedPositions[0]];
    visited.add(`${occupiedPositions[0][0]},${occupiedPositions[0][1]}`);

    while (queue.length > 0) {
      const [row, col] = queue.shift()!;
      
      // Check 4 adjacent cells
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;
        const key = `${newRow},${newCol}`;
        
        if (newRow >= 0 && newRow < 9 && newCol >= 0 && newCol < 9 && 
            !grid[newRow][newCol].isEmpty && !visited.has(key)) {
          visited.add(key);
          queue.push([newRow, newCol]);
        }
      }
    }

    return visited.size === occupiedPositions.length;
  };

  const hasCenterMaterial = (): boolean => {
    const centerRow = 4; // Center of 9x9 grid (0-indexed)
    const centerCol = 4;
    return !grid[centerRow][centerCol].isEmpty;
  };

  const isValidCraft = (): boolean => {
    const materials = getMaterialsOnGrid();
    return materials.length === 15 && isConnected() && hasCenterMaterial();
  };

  const getGridAsArray = (): (string | null)[][] => {
    return grid.map(row => 
      row.map(slot => slot.isEmpty ? null : slot.material?.id || null)
    );
  };

  const handleCraft = async () => {
    if (isValidCraft()) {
      const gridArray = getGridAsArray();
      await onCraft(gridArray, selectedWeaponType);
      // Clear grid and reset used materials after successful craft
      clearGrid();
    }
  };

  const clearGrid = () => {
    setGrid(Array(9).fill(null).map(() => 
      Array(9).fill(null).map(() => ({ material: null, isEmpty: true }))
    ));
    setUsedMaterials({}); // Reset used materials when clearing grid
  };

  const materials = getMaterialsOnGrid();
  const craftValid = isValidCraft();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Inventory Panel */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">Inventory</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {inventory
              .map((item, index) => {
                const usedCount = usedMaterials[item.material.id] || 0;
                const availableCount = item.quantity - usedCount;
                return { ...item, availableCount, index };
              })
              .filter(item => item.availableCount > 0)
              .map((item) => (
                <div
                  key={`${item.material.id}-${item.index}`}
                  draggable={true}
                  onDragStart={() => handleDragStart(item.material)}
                  className="bg-white/5 rounded p-3 cursor-grab hover:bg-white/10 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">{item.material.name}</span>
                    <span className="text-yellow-400 font-semibold">x{item.availableCount}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Crafting Grid */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">Crafting Grid</h3>
          <div className="grid grid-cols-9 gap-1 mb-4">
            {grid.map((row, rowIndex) =>
              row.map((slot, colIndex) => {
                const isCenter = rowIndex === 4 && colIndex === 4;
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`w-8 h-8 border rounded cursor-pointer flex items-center justify-center text-xs ${
                      isCenter 
                        ? 'border-yellow-400 border-2' 
                        : 'border-white/30'
                    } ${
                      slot.isEmpty 
                        ? 'bg-white/5 hover:bg-white/10' 
                        : 'bg-blue-500/50 hover:bg-blue-500/70'
                    }`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                    onClick={() => handleSlotClick(rowIndex, colIndex)}
                    title={slot.material?.name || (isCenter ? 'Center (Required)' : 'Empty')}
                  >
                    {slot.material && (
                      <span className="text-white font-bold">
                        {slot.material.name.charAt(0)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={clearGrid}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="text-sm text-white/80">
            <p>Materials: {materials.length}/15 {materials.length === 15 ? '✓' : ''}</p>
            <p>Connected: {isConnected() ? '✓' : '✗'}</p>
            <p>Center: {hasCenterMaterial() ? '✓' : '✗'}</p>
          </div>
        </div>

        {/* Weapon Selection & Craft */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
          <h3 className="text-xl font-bold text-white mb-4">Weapon Type</h3>
          
          <div className="grid grid-cols-1 gap-2 mb-6">
            {WEAPON_TYPES.map((weapon) => (
              <button
                key={weapon}
                onClick={() => setSelectedWeaponType(weapon)}
                className={`p-2 rounded text-left transition-colors capitalize ${
                  selectedWeaponType === weapon 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white/5 text-white/80 hover:bg-white/10'
                }`}
              >
                {weapon}
              </button>
            ))}
          </div>

          <button
            onClick={handleCraft}
            disabled={!craftValid}
            className={`w-full py-3 rounded font-semibold transition-colors ${
              craftValid
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Craft {selectedWeaponType.slice(0, -1)}
          </button>
        </div>
      </div>
    </div>
  );
}