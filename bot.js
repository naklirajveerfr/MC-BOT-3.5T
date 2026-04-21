const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const armorManager = require('mineflayer-armor-manager')
const { Vec3 } = require('vec3')
const fs = require('fs')

// Load settings
const settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'))

const bot = mineflayer.createBot({
  host: '127.0.0.1',      
  port: 25566,            
  username: settings['bot-account'].username,
  auth: settings['bot-account'].type,
  version: '1.21.1'
})

bot.loadPlugin(pathfinder)
bot.loadPlugin(armorManager)

let followTarget = null
let lastFollowTarget = null
let killMode = false
let fleeing = false
let isSleeping = false
let eating = false
let lastFoodWarning = 0

const hostileMobs = [
  'zombie', 'skeleton', 'creeper', 'spider', 'drowned', 'husk'
]

// ---------- SPAWN ----------
bot.once('spawn', () => {
  console.log('[Bot] Connected! Version:', bot.version)
  const mcData = require('minecraft-data')(bot.version)
  bot.mcData = mcData

  const movements = new Movements(bot, mcData)
  movements.allowSprinting = true
  bot.pathfinder.setMovements(movements)

  // Auto-auth
  if (settings.utils['auto-auth'].enabled) {
    setTimeout(() => {
      bot.chat(`/register ${settings.utils['auto-auth'].password} ${settings.utils['auto-auth'].password}`)
      setTimeout(() => {
        bot.chat(`/login ${settings.utils['auto-auth'].password}`)
      }, 1000)
    }, 2000)
  }

  console.log('[Bot] Pathfinder initialized.')
})

// ---------- CHAT ----------
bot.on('chat', (username, message) => {
  if (username === bot.username) return
  const player = bot.players[username]?.entity

  if (message === 'come' && player) {
    followTarget = player
    lastFollowTarget = null
    bot.chat('coming')
  }
  if (message === 'follow_mode ON' && player) {
    followTarget = player
    lastFollowTarget = null
    bot.chat('Follow mode enabled')
  }
  if (message === 'follow_mode OFF') {
    followTarget = null
    bot.pathfinder.setGoal(null)
    bot.chat('Follow mode disabled')
  }
  if (message === 'stop') {
    followTarget = null
    lastFollowTarget = null
    bot.pathfinder.setGoal(null)
    bot.chat('Stopped')
  }
  if (message === 'kill_mode ON') {
    killMode = true
    bot.chat('Kill mode enabled')
  }
  if (message === 'kill_mode OFF') {
    killMode = false
    bot.chat('Kill mode disabled')
  }
  if (message === 'status') {
    bot.chat(`HP: ${bot.health}/20 | Food: ${bot.food}/20 | Follow: ${!!followTarget} | Kill: ${killMode}`)
  }
})

// ---------- EQUIP ----------
function equipBestSword() {
  const swords = bot.inventory.items().filter(i => i.name.includes('sword'))
  if (!swords.length) return
  bot.equip(swords[0], 'hand').catch(() => {})
}

function equipShield() {
  const shield = bot.inventory.items().find(i => i.name === 'shield')
  if (!shield) return
  bot.equip(shield, 'off-hand').catch(() => {})
}

bot.on('playerCollect', collector => {
  if (collector !== bot.entity) return
  setTimeout(() => {
    bot.armorManager.equipAll()
    equipBestSword()
    equipShield()
  }, 500)
})

// ---------- FOOD ----------
async function eatFood() {
  if (bot.food >= 20 || eating) return

  const foodItem = bot.inventory.items().find(i => i.name === 'bread' || i.name === 'melon_slice')
  if (!foodItem) {
    if (bot.food <= 4 && Date.now() - lastFoodWarning > 5000) {
      bot.chat('i need food')
      lastFoodWarning = Date.now()
    }
    return
  }

  eating = true
  try {
    await bot.unequip('hand')
    await bot.equip(foodItem, 'hand')
    await bot.consume() // properly holds right-click for food
    console.log('[Bot] Eating', foodItem.name)
  } catch (err) {
    console.log('[Bot] Failed to eat:', err.message)
  } finally {
    eating = false
  }
}

// ---------- FOLLOW LOGIC ----------
bot.on('physicsTick', () => {
  if (followTarget && !fleeing) {
    if (lastFollowTarget !== followTarget || !bot.pathfinder.goal) {
      bot.pathfinder.setGoal(new goals.GoalFollow(followTarget, 2), true)
      lastFollowTarget = followTarget
    }
  }
})

// ---------- COMBAT & SHIELD ----------
bot.on('physicsTick', () => {
  if (fleeing) return

  // Shield usage
  const threat = bot.nearestEntity(e => e.type === 'mob' && hostileMobs.includes(e.name))
  if (threat) {
    const dist = bot.entity.position.distanceTo(threat.position)
    if (dist <= 3) {
      equipShield()
      bot.activateItem()
    } else bot.deactivateItem()
  }

  // Kill mode
  if (!killMode) return
  const target = bot.nearestEntity(e => e.type === 'mob' && hostileMobs.includes(e.name))
  if (!target) return

  equipBestSword()
  const dist = bot.entity.position.distanceTo(target.position)
  if (dist > 3) bot.pathfinder.setGoal(new goals.GoalFollow(target, 2), true)
  else {
    bot.lookAt(target.position.offset(0, 1.6, 0))
    bot.attack(target)
  }
})

// ---------- FLEE ----------
bot.on('physicsTick', () => {
  if (bot.health <= 8) {
    fleeing = true
    eatFood()

    const threat = bot.nearestEntity(e => e.type === 'mob' && hostileMobs.includes(e.name))
    if (threat) {
      const dir = bot.entity.position.minus(threat.position).normalize().scaled(5)
      const fleePos = bot.entity.position.plus(dir)
      bot.pathfinder.setGoal(new goals.GoalBlock(
        Math.floor(fleePos.x),
        Math.floor(fleePos.y),
        Math.floor(fleePos.z)
      ))
    }
  } else fleeing = false
})

// ---------- SLEEP ----------
async function handleSleep() {
  if (isSleeping) return
  const bedItem = bot.inventory.items().find(i => i.name.includes('bed'))
  if (!bedItem) return

  const pos = bot.entity.position.floored()
  const blockBelow = bot.blockAt(pos.offset(0, -1, 0))
  if (!blockBelow || !bot.mcData.blocks[blockBelow.type].solid) return

  try {
    await bot.pathfinder.goto(new goals.GoalBlock(pos.x, pos.y, pos.z))
    await bot.equip(bedItem, 'hand')
    await bot.placeBlock(blockBelow, new Vec3(0, 1, 0))

    const placedBed = bot.findBlock({ matching: b => b.name.includes('bed'), maxDistance: 4 })
    if (!placedBed) return

    await bot.sleep(placedBed)
    isSleeping = true
    console.log('[Bot] Sleeping...')
  } catch (err) {
    console.log('[Bot] Failed to sleep:', err.message)
  }
}

bot.on('wake', async () => {
  isSleeping = false
  const bedBlock = bot.findBlock({ matching: b => b.name.includes('bed'), maxDistance: 4 })
  if (bedBlock) {
    try { await bot.dig(bedBlock) } catch {}
  }
})

// Check sleep every tick
bot.on('physicsTick', () => {
  if (!isSleeping && bot.time.isNight) handleSleep()
})

// Hunger check every tick
bot.on('physicsTick', () => {
  if (!isSleeping) eatFood()
})

// ---------- ERROR HANDLING ----------
bot.on('error', err => console.error('[Bot Error]', err.message))
bot.on('kicked', reason => console.log('[Bot] Kicked:', reason))
bot.on('end', () => console.log('[Bot] Disconnected.'))
