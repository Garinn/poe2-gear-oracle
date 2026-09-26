-- Transport and orchestration only. All game calculations stay in upstream PoB2.
local json = require('dkjson')
local request = assert(json.decode(io.read('*a')))
dofile('HeadlessWrapper.lua')
local function check()
  assert(not launch.promptMsg, tostring(launch.promptMsg))
end
check()
local function calculate()
  build.modFlag = true
  build.buildFlag = true
  runCallback('OnFrame')
  check()
  assert(build.calcsTab.mainOutput, 'PoB did not calculate output')
end
local function load(xml)
  newBuild()
  loadBuildFromXML(xml, 'Gear Oracle')
  check()
  calculate()
end
local function clean(s) return (tostring(s):gsub('%^x%x%x%x%x%x%x',''):gsub('%^%d','')) end
local function unsupported(item)
  local lines = {}
  for _, key in ipairs({'explicitModLines','implicitModLines','enchantModLines','runeModLines'}) do
    for _, line in ipairs(item[key] or {}) do
      if not line.modList or line.extra then table.insert(lines, line.line) end
    end
  end
  return lines
end
local function snapshot()
  local out = build.calcsTab.mainOutput
  local metrics = {}
  for k,v in pairs(out) do
    if type(v)=='number' and v==v and v~=math.huge and v~=-math.huge then metrics[k]=v end
  end
  local equipment, skills, warnings = {}, {}, {}
  for _, w in ipairs(build.controls.warnings.lines or {}) do table.insert(warnings,clean(w)) end
  for slot,s in pairs(build.itemsTab.slots) do
    if not s.nodeId and s.selItemId and s.selItemId ~= 0 then
      local i=build.itemsTab.items[s.selItemId]
      if i and i.requirements and i.requirements.level and i.requirements.level > build.characterLevel then table.insert(warnings, slot..' requires level '..i.requirements.level) end
      if i then table.insert(equipment,{slot=slot,name=i.name,rarity=i.rarity,raw=i.raw,unsupported=unsupported(i)}) end
    end
  end
  for _, g in ipairs(build.skillsTab.socketGroupList) do
    for _, gem in ipairs(g.gemList) do
      if gem.enabled and not gem.gemData then table.insert(warnings,'Unrecognised gem: '..tostring(gem.nameSpec)) end
      if gem.enabled and g.enabled then table.insert(skills,{name=gem.nameSpec,level=gem.level}) end
    end
  end
  local main = build.calcsTab.mainEnv.player.mainSkill
  return {metrics=metrics,equipment=equipment,skills=skills,warnings=warnings,
    metadata={level=build.characterLevel,class=build.spec.curClassName,ascendancy=build.spec.curAscendClassName,
    treeVersion=build.spec.treeVersion,mainSkill=main and main.activeEffect.grantedEffect.name or 'Unknown',
    itemSet=build.itemsTab.activeItemSetId,skillSet=build.skillsTab.activeSkillSetId}}
end
local function replace(raw)
  -- Runes/jewels belong to the old helmet. Never carry those across implicitly.
  for name,slot in pairs(build.itemsTab.runeSlots) do
    if name:match('^Helmet Rune') then
      slot:SelByValue('None','name')
      build.itemsTab.activeItemSet[name]={runeName='None'}
    end
  end
  for name,slot in pairs(build.itemsTab.slots) do
    if name:match('^Helmet Jewel Socket') then slot:SetSelItemId(0) end
  end
  if raw then
    local item=new('Item'):Item(raw)
    assert(item.base and item.type=='Helmet', 'Candidate must be a recognised PoE2 helmet')
    assert(item.rarity=='RARE', 'V1 evaluates rare helmets only')
    build.itemsTab:AddItem(item,true)
    build.itemsTab.slots.Helmet:SetSelItemId(item.id)
  else
    build.itemsTab.slots.Helmet:SetSelItemId(0)
  end
  build.itemsTab:PopulateSlots()
  calculate()
end
local ok,result=xpcall(function()
  load(request.xml)
  if request.mode=='replacement' then replace(request.item) end
  if request.mode=='probe' then
    build.configTab.input.customMods=(build.configTab.input.customMods or '')..'\n'..request.mod
    build.configTab:BuildModList()
    calculate()
  end
  return snapshot()
end,debug.traceback)
if ok then io.write('\nGEAR_ORACLE_JSON:',json.encode(result),'\n')
else io.write('\nGEAR_ORACLE_JSON:',json.encode({error=result}),'\n'); os.exit(1) end
