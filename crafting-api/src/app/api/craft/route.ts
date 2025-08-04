import { NextRequest, NextResponse } from 'next/server';

interface CraftRequest {
  grid: (string | null)[][];
  weaponType: string;
}

interface Weapon {
  name: string;
  type: string;
  description: string;
  stats: {
    attack?: number;
    defense?: number;
    speed?: number;
    magic?: number;
  };
  effects: string[];
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

const MOCK_WEAPONS: { [key: string]: Weapon[] } = {
  snipers: [
    {
      name: "Voidscope Eliminator",
      type: "sniper",
      description: "A precision rifle that bends spacetime to guarantee perfect shots across impossible distances.",
      stats: { attack: 150, speed: 45, magic: 85 },
      effects: ["Ignores distance penalties", "Phase bullets pierce all obstacles", "+50% critical damage on headshots"],
      rarity: "legendary"
    }
  ],
  shields: [
    {
      name: "Aegis of Eternal Defiance",
      type: "shield",
      description: "A shield that grows stronger with each blow it deflects, becoming an impenetrable fortress.",
      stats: { defense: 120, magic: 80, speed: 40 },
      effects: ["Reflects 25% damage back to attacker", "Damage reduction increases with consecutive blocks", "Generates protective aura for allies"],
      rarity: "legendary"
    }
  ],
  swords: [
    {
      name: "Voidrender Blade",
      type: "sword",
      description: "A sword forged from the essence of the void, it cuts through reality itself.",
      stats: { attack: 110, speed: 75, magic: 60 },
      effects: ["Void damage ignores resistances", "Chance to teleport behind enemy", "Drains enemy mana"],
      rarity: "legendary"
    }
  ],
  staves: [
    {
      name: "Staff of Prismatic Chaos",
      type: "staff",
      description: "A staff that channels the raw power of chaos magic, unpredictable but devastating.",
      stats: { attack: 80, magic: 120, speed: 50 },
      effects: ["Random elemental damage each cast", "Chaos surge: double damage chance", "Spell effects last 50% longer"],
      rarity: "legendary"
    }
  ]
};

export async function POST(request: NextRequest) {
  try {
    const { grid, weaponType }: CraftRequest = await request.json();

    if (!grid || !weaponType) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing grid or weaponType' 
      }, { status: 400 });
    }

    // Count materials in grid
    const materialCount = grid.flat().filter(cell => cell !== null).length;
    
    if (materialCount !== 15) {
      return NextResponse.json({ 
        success: false, 
        error: `Crafting requires exactly 15 materials, got ${materialCount}` 
      }, { status: 400 });
    }

    // Get mock weapon for the weapon type
    const weaponOptions = MOCK_WEAPONS[weaponType] || MOCK_WEAPONS.swords;
    const weapon = weaponOptions[0]; // For testing, always return the first option

    // Add some variation based on material count
    const scaledWeapon: Weapon = {
      ...weapon,
      stats: {
        ...weapon.stats,
        attack: (weapon.stats.attack || 0) + materialCount * 2,
        defense: (weapon.stats.defense || 0) + materialCount,
        speed: weapon.stats.speed,
        magic: (weapon.stats.magic || 0) + materialCount
      }
    };

    console.log(`Crafted ${weaponType} with ${materialCount} materials:`, scaledWeapon.name);

    return NextResponse.json({
      success: true,
      weapon: scaledWeapon
    });

  } catch (error) {
    console.error('Error in crafting API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}