# Reproducible demo loadout derived from the attributed public build.
import xml.etree.ElementTree as ET,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def helmet(name,life,strength,dex,intel,evasion=60):
 return f'Rarity: RARE\n{name}\nViper Cap\nItem Level: 82\nQuality: 20\nImplicits: 0\n+{life} to maximum Life\n{evasion}% increased Evasion Rating\n+80 to Evasion Rating\n+{strength} to Strength\n+{dex} to Dexterity\n+{intel} to Intelligence'
base=ET.parse(root/'fixtures/gemling.xml')
r=base.getroot();skills=r.find('./Skills/SkillSet')
for group in list(skills):
 gems=group.findall('Gem')
 if gems and gems[0].get('nameSpec') in ['Blasphemy','Eternal Rage','Berserk'] and not group.get('source'):skills.remove(group)
items=r.find('Items');active=items.get('activeItemSet');iset=next(x for x in items.findall('ItemSet') if x.get('id')==active)
slot=next(s for s in iset.findall('Slot') if s.get('name')=='Helmet')
item=next(x for x in items.findall('Item') if x.get('id')==slot.get('itemId'))
item.text=helmet('Dusk Shelter',90,18,18,18)
base.write(root/'fixtures/current.xml',encoding='unicode')
item.text=helmet('Empyrean Shelter',150,25,25,25,95)
base.write(root/'fixtures/target.xml',encoding='unicode')
candidates=[{'id':'balanced','name':'Empyrean Shelter','price':8,'text':item.text}, {'id':'value','name':'Gale Shelter','price':5,'text':helmet('Gale Shelter',130,20,20,20,85)}, {'id':'broken','name':'Hollow Shelter','price':3,'text':helmet('Hollow Shelter',170,0,0,0,110)}]
for c in candidates:
 c['currency']='exalted'
 c['text']='\n'.join(line for line in c['text'].splitlines() if not line.startswith('+0 to '))
(root/'fixtures/candidates.json').write_text(json.dumps(candidates,indent=2))
