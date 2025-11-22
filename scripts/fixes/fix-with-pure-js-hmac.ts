/**
 * Fix with Pure JavaScript HMAC-SHA256
 *
 * Implement HMAC-SHA256 without ANY crypto module references
 */

import { n8nClient } from './shared/libs/n8n'

const WORKFLOW_ID = 'lj35rsDvrz5LK9Ox'

async function fixWithPureJsHmac() {
  console.log('🔧 Implementing Pure JS HMAC-SHA256\n')

  try {
    console.log('1️⃣  Fetching workflow...')
    const workflow = await n8nClient.getWorkflow(WORKFLOW_ID)
    console.log(`   ✅ Loaded: ${workflow.name}\n`)

    console.log('2️⃣  Finding signature node...')
    const signatureNodeIndex = workflow.nodes.findIndex(
      n => n.name === 'Prepare Signature String'
    )

    if (signatureNodeIndex === -1) {
      throw new Error('Signature node not found')
    }

    const node = workflow.nodes[signatureNodeIndex]
    console.log(`   ✅ Found at index ${signatureNodeIndex}\n`)

    console.log('3️⃣  Creating pure JavaScript HMAC-SHA256 implementation...')
    console.log('   (No crypto module or global references)\n')

    // Pure JavaScript HMAC-SHA256 implementation
    const fixedCode = `// Unleashed API Authentication - Pure JavaScript HMAC-SHA256
// No crypto modules or globals - completely self-contained

const API_AUTH_ID = '7fda9404-7197-477b-89b1-dadbcefae168'
const API_AUTH_SECRET = 'a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ=='

// SHA-256 implementation
function sha256(message) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount))
  }

  const mathPow = Math.pow
  const maxWord = mathPow(2, 32)
  const lengthProperty = 'length'
  let i, j
  let result = ''

  const words = []
  const asciiBitLength = message[lengthProperty] * 8

  let hash = (sha256.h = sha256.h || [])
  const k = (sha256.k = sha256.k || [])
  let primeCounter = k[lengthProperty]

  const isComposite = {}
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0
    }
  }

  message += '\\x80'
  while ((message[lengthProperty] % 64) - 56) message += '\\x00'
  for (i = 0; i < message[lengthProperty]; i++) {
    j = message.charCodeAt(i)
    if (j >> 8) return
    words[i >> 2] |= j << (((3 - i) % 4) * 8)
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0
  words[words[lengthProperty]] = asciiBitLength

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16))
    const oldHash = hash
    hash = hash.slice(0, 8)

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2]

      const a = hash[0],
        e = hash[4]
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0)

      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))

      hash = [(temp1 + temp2) | 0].concat(hash)
      hash[4] = (hash[4] + temp1) | 0
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255
      result += (b < 16 ? 0 : '') + b.toString(16)
    }
  }
  return result
}

// HMAC-SHA256 implementation
function hmacSha256(key, message) {
  const blockSize = 64
  const opad = new Array(blockSize)
  const ipad = new Array(blockSize)

  // If key is longer than block size, hash it
  if (key.length > blockSize) {
    key = sha256(key)
    // Convert hex to string
    let keyStr = ''
    for (let i = 0; i < key.length; i += 2) {
      keyStr += String.fromCharCode(parseInt(key.substr(i, 2), 16))
    }
    key = keyStr
  }

  // Pad key to block size
  for (let i = 0; i < blockSize; i++) {
    const keyByte = i < key.length ? key.charCodeAt(i) : 0
    opad[i] = String.fromCharCode(0x5c ^ keyByte)
    ipad[i] = String.fromCharCode(0x36 ^ keyByte)
  }

  const innerHash = sha256(ipad.join('') + message)

  // Convert hex to string for outer hash
  let innerStr = ''
  for (let i = 0; i < innerHash.length; i += 2) {
    innerStr += String.fromCharCode(parseInt(innerHash.substr(i, 2), 16))
  }

  return sha256(opad.join('') + innerStr)
}

// Convert hex to base64
function hexToBase64(hexString) {
  const bytes = []
  for (let i = 0; i < hexString.length; i += 2) {
    bytes.push(parseInt(hexString.substr(i, 2), 16))
  }

  const binString = bytes.map(byte => String.fromCharCode(byte)).join('')
  return btoa(binString)
}

// Generate signature
const method = 'POST'
const url = 'https://api.unleashedsoftware.com/SalesOrders'
const queryString = ''
const signatureString = method + url + queryString

const hmacHex = hmacSha256(API_AUTH_SECRET, signatureString)
const signature = hexToBase64(hmacHex)

// Return items with auth headers
const items = $input.all()
return items.map(item => ({
  json: {
    ...item.json,
    _authHeaders: {
      'api-auth-id': API_AUTH_ID,
      'api-auth-signature': signature
    }
  }
}))`

    // Update the node
    workflow.nodes[signatureNodeIndex] = {
      ...node,
      parameters: {
        jsCode: fixedCode,
      },
    }

    console.log('   ✅ Created pure JS implementation (no crypto references)\n')

    console.log('4️⃣  Uploading to n8n...')
    const workflowUpdate = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
      staticData: workflow.staticData,
    }

    const updated = await n8nClient.updateWorkflow(WORKFLOW_ID, workflowUpdate)
    console.log(`   ✅ Updated at: ${updated.updatedAt}\n`)

    console.log('═'.repeat(70))
    console.log('✅ PURE JAVASCRIPT SOLUTION APPLIED')
    console.log('═'.repeat(70))
    console.log()
    console.log('Implementation:')
    console.log('  ✅ Pure JavaScript SHA-256 algorithm')
    console.log('  ✅ Pure JavaScript HMAC implementation')
    console.log('  ✅ No crypto module or global references')
    console.log('  ✅ No require() statements')
    console.log('  ✅ Fully self-contained code')
    console.log()
    console.log('This should work in n8n without any restrictions!')
    console.log()
    console.log('View workflow: https://automation.growthcohq.com/workflow/' + WORKFLOW_ID)
    console.log()

  } catch (error) {
    console.error('❌ Error:')
    if (error instanceof Error) {
      console.error(`   ${error.message}`)
    } else {
      console.error(`   ${String(error)}`)
    }
    process.exit(1)
  }
}

fixWithPureJsHmac()
