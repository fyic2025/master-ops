// Test the fixed authentication
import { sha256, hmacSha256, hexToBase64 } from './test-unleashed-auth'

const API_AUTH_ID = '7fda9404-7197-477b-89b1-dadbcefae168'
const API_AUTH_SECRET = 'a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ=='

// Sign empty string (no query params for POST)
const queryString = ''

console.log('Testing FIXED authentication...\n')
console.log('Signature string:', `"${queryString}"`, '(empty for POST)')

// Use the same HMAC implementation
function sha256Fixed(message: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount))
  }

  const mathPow = Math.pow
  const maxWord = mathPow(2, 32)
  const lengthProperty = 'length'
  let i: number, j: number
  let result = ''

  const words: number[] = []
  const asciiBitLength = message[lengthProperty] * 8

  let hash = (sha256Fixed as any).h = (sha256Fixed as any).h || []
  const k = (sha256Fixed as any).k = (sha256Fixed as any).k || []
  let primeCounter = k[lengthProperty]

  const isComposite: Record<number, number> = {}
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0
    }
  }

  message += '\x80'
  while ((message[lengthProperty] % 64) - 56) message += '\x00'
  for (i = 0; i < message[lengthProperty]; i++) {
    j = message.charCodeAt(i)
    if (j >> 8) return ''
    words[i >> 2] |= j << (((3 - i) % 4) * 8)
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0
  words[words[lengthProperty]] = asciiBitLength

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16))
    const oldHash = hash
    hash = hash.slice(0, 8)

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15]
      const w2 = w[i - 2]

      const a = hash[0]
      const e = hash[4]
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
      result += (b < 16 ? '0' : '') + b.toString(16)
    }
  }
  return result
}

function hmacSha256Fixed(key: string, message: string): string {
  const blockSize = 64
  const opad = new Array(blockSize)
  const ipad = new Array(blockSize)

  if (key.length > blockSize) {
    key = sha256Fixed(key)
    let keyStr = ''
    for (let i = 0; i < key.length; i += 2) {
      keyStr += String.fromCharCode(parseInt(key.substr(i, 2), 16))
    }
    key = keyStr
  }

  for (let i = 0; i < blockSize; i++) {
    const keyByte = i < key.length ? key.charCodeAt(i) : 0
    opad[i] = String.fromCharCode(0x5c ^ keyByte)
    ipad[i] = String.fromCharCode(0x36 ^ keyByte)
  }

  const innerHash = sha256Fixed(ipad.join('') + message)

  let innerStr = ''
  for (let i = 0; i < innerHash.length; i += 2) {
    innerStr += String.fromCharCode(parseInt(innerHash.substr(i, 2), 16))
  }

  return sha256Fixed(opad.join('') + innerStr)
}

function hexToBase64Fixed(hexString: string): string {
  const bytes = []
  for (let i = 0; i < hexString.length; i += 2) {
    bytes.push(parseInt(hexString.substr(i, 2), 16))
  }

  const binString = bytes.map(byte => String.fromCharCode(byte)).join('')
  return Buffer.from(binString, 'binary').toString('base64')
}

const hmacHex = hmacSha256Fixed(API_AUTH_SECRET, queryString)
const signature = hexToBase64Fixed(hmacHex)

console.log('Signature:', signature)
console.log()

// Test with API
async function test() {
  const url = 'https://api.unleashedsoftware.com/SalesOrders'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'api-auth-id': API_AUTH_ID,
      'api-auth-signature': signature,
      'client-type': 'growthcohq/n8n-sync'
    },
    body: JSON.stringify({
      OrderNumber: "TEST-" + Date.now(),
      OrderDate: new Date().toISOString(),
      OrderStatus: "Parked",
      Customer: {
        CustomerCode: "test@example.com",
        CustomerName: "Test"
      }
    })
  })

  console.log('Response:', response.status, response.statusText)
  const text = await response.text()
  console.log(text.substring(0, 500))

  if (response.status === 200 || response.status === 201) {
    console.log('\n✅ SUCCESS! Authentication works!')
  } else {
    console.log('\n❌ Still failing:', response.status)
  }
}

test()
