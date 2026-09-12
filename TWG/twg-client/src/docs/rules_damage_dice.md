# Damage-by-Dice-Count & Weapon Allocation Rules (DESIGN-012 & DESIGN-013)

## 1. Overview & Mechanical Motivation
In tactical wargaming, units composed of multiple physical models (e.g. 5-model infantry squads) require a damage resolution system that correctly scales with model count, respects the physical reality of individual squad members, and prevents single extreme die rolls from decimating an entire squad without an explicit splash/cleave mechanic.

This document establishes:
- **DESIGN-012**: Dice-per-model scaling formula, weapon die type tiering, and sequential single-model damage allocation (no spillover).
- **DESIGN-013**: Splash and Area-of-Effect (AoE) attack properties.

---

## 2. Dice-per-Model Scaling Formula (DESIGN-012)

### 2.1 Attack Pool Calculation
When a unit attacks (in Shooting or Melee Fight phase), the number of dice rolled is derived from the number of **active living models** in the attacking squad:
\text{Attack Dice Count} = \sum_{m \in \text{Living Models}} \text{Attacks Per Model}(m)

- **Default Infantry**: Each living model contributes **1 die** (e.g., a 5-model squad rolls 5 dice; if 2 models have died, the 3 remaining models roll 3 dice).
- **Elites / Leaders**: Certain unit types may have an ttacksPerModel stat > 1 (e.g., a melee Champion might contribute 2 or 3 dice).
- **Mounted / Vehicles / Monsters**: Single-model units have a fixed attack die count specified in their datasheet (e.g., a Dreadnought Tank rolls 4 dice).

### 2.2 Die Type Tiering by Unit Role
Die types (d4, d6, d8, d10, d12, d20) are **fixed weapon properties**, not dynamically chosen per model count. To prevent runaway lethality (e.g., a 5-model squad rolling 5d20 would wipe out entire armies in one activation), weapons are balanced across specific role tiers:

| Tier | Unit Role / Category | Typical Die Type | Typical Model Count | Mechanical Niche |
| :--- | :--- | :--- | :--- | :--- |
| **Swarm / Battleline** | Conscripts, Militia, Standard Troopers | **d6** | 5 - 10 models | Volume of fire; individually low damage |
| **Elite Infantry / Cavalry** | Shock Troops, Knights, Heavy Gunners | **d8** | 3 - 5 models | Balanced armor penetration and threat |
| **Specialist Weapons** | Sniper Rifles, Plasma Carbines | **d10** | 1 - 3 models | High precision against single targets |
| **Monsters / Heavy Walkers**| Behemoths, Brutes, Siege Engines | **d12** | 1 - 2 models | Devastating single strikes |
| **Super-Heavy / Artillery** | Prime Warmachines, God-Engines | **d20** | 1 model | Massive impact, rare activations |

---

## 3. Sequential Single-Model Damage Allocation (No Overflow)

### 3.1 The Allocation Principle
A single weapon strike or die result cannot kill multiple individual combatants unless the weapon possesses the Cleave or Splash trait.
Each individual attack die that successfully hits and penetrates defense is **allocated to exactly one target model at a time**.

### 3.2 Resolution Algorithm
1. **Target Selection**: The defender declares which model in the defending squad is currently taking damage (or the front-most model nearest to the attacker takes damage first).
2. **Die Application**: The damage value rolled on an attack die is subtracted from that specific model's remaining Health Points (HP).
3. **Model Casualty & No Overflow**:
   - If the die deals damage >= the model's remaining HP, that model is removed as a casualty.
   - **Any excess damage from that specific die is wasted / discarded.** It does **not** bleed or overflow into adjacent models in the squad.
   - *Example*: A defender's model has 2 HP remaining. The attacker rolls an 8 on a d8. The model takes 2 damage and dies; the remaining 6 damage vanishes into the destroyed model.
4. **Subsequent Dice**: If the attacker has remaining successful attack dice, the defender selects the next living model in the squad, and the next die is applied.

### 3.3 The Cleave Trait (Exception to Rule)
Only units with the explicit **Cleave [X]** trait may carry overflow damage across adjacent models in unit coherency (up to X total models per attack).

---

## 4. Splash and Area-of-Effect (AoE) Attacks (DESIGN-013)

### 4.1 Definition
Area-of-Effect damage is not a universal rule applied to all high damage rolls. It is an explicit weapon trait defined in the unit profile:
`	s
interface SplashProperty {
  radiusPx: number;      // Radius around primary target model in pixels (e.g. 75px = 1.5)
 secondaryDice: string; // Secondary die rolled against each caught model (e.g. 1d4 or 1d6)
 friendlyFire: boolean; // Whether allied units within radius take blast damage
}
`

### 4.2 Splash Resolution Sequence
1. **Primary Hit**: Resolve the primary attack against the chosen target model using the standard single-model allocation rules.
2. **Blast Perimeter**: Measure from the center of the primary target model token outwards to adiusPx.
3. **Secondary Victims**: Every other model (excluding the primary target) whose base falls within the blast circle is caught in the blast.
4. **Secondary Roll**: Roll secondaryDice independently for each caught model.

---

## 5. Implementation Roadmap
- **Phase 1**: Finalize and record this design specification in project documentation (DESIGN-012 & DESIGN-013).
- **Phase 2 (Post-MVP)**: Implement ttacksPerModel and weaponDieType on unit datasheets in UnitCreatorModal.tsx.
- **Phase 3 (Post-MVP)**: Update combatEngine.ts to implement the die-by-die model allocation loop with no-overflow and splash radius queries.
