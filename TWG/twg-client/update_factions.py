import re

with open('src/data/factions.ts', 'r', encoding='utf-8') as f:
    content = f.read()

def update_unit(m):
    unit_str = m.group(0)
    if "type: 'Character'" in unit_str:
        if any(w in unit_str for w in ['Supreme', 'Warmaster', 'Arch-', 'Prime', 'Lyssandra']):
            role = 'Legendary Leader'
        else:
            role = 'Leader'
    elif any(w in unit_str for w in ['Vanguard', 'Cohort', 'Wardens', 'Marksmen']):
        role = 'Battleline'
    elif any(w in unit_str for w in ["type: 'Vehicle'", "type: 'Monster'"]):
        role = 'Vehicle / Monster'
    else:
        role = 'Infantry / Mounted'
    
    unit_str = re.sub(r"(type: '[^']+',)", r"\1\n    role: '" + role + "',", unit_str)
    
    if role in ['Legendary Leader', 'Leader', 'Vehicle / Monster']:
        mc = 1
    elif 'Cohort' in unit_str or 'Vanguard' in unit_str:
        mc = 5
    else:
        mc = 4
        
    lives_match = re.search(r'lives: (\d+)', unit_str)
    lives = int(lives_match.group(1)) if lives_match else 4
    hp_per_model = max(1, lives // mc) if mc <= lives else 1
    
    rep = f"\\1\n      modelCount: {mc},\n      hpPerModel: {hp_per_model},"
    unit_str = re.sub(r'(maxLives: \d+,)', rep, unit_str)
    return unit_str

pattern = re.compile(r'\{\s+id: \'\',\s+templateId:.*?disadvantageStacks: 0\s+\}', re.DOTALL)
new_content = pattern.sub(update_unit, content)

with open('src/data/factions.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Updated factions.ts successfully!')
