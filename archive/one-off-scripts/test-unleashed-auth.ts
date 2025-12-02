/**
 * Test Unleashed Authentication
 *
 * Verify our HMAC signature matches what Unleashed expects
 */

// First, let's implement the HMAC the same way we did in the workflow
// and test it to make sure it's generating the right signature

function sha256(message: string): string {
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

  let hash = (sha256 as any).h = (sha256 as any).h || []
  const k = (sha256 as any).k = (sha256 as any).k || []
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

function hmacSha256(key: string, message: string): string {
  const blockSize = 64
  const opad = new Array(blockSize)
  const ipad = new Array(blockSize)

  if (key.length > blockSize) {
    key = sha256(key)
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

  const innerHash = sha256(ipad.join('') + message)

  let innerStr = ''
  for (let i = 0; i < innerHash.length; i += 2) {
    innerStr += String.fromCharCode(parseInt(innerHash.substr(i, 2), 16))
  }

  return sha256(opad.join('') + innerStr)
}

function hexToBase64(hexString: string): string {
  const bytes = []
  for (let i = 0; i < hexString.length; i += 2) {
    bytes.push(parseInt(hexString.substr(i, 2), 16))
  }

  const binString = bytes.map(byte => String.fromCharCode(byte)).join('')
  return Buffer.from(binString, 'binary').toString('base64')
}

// Test with your actual credentials
const API_AUTH_ID = '7fda9404-7197-477b-89b1-dadbcefae168'
const API_AUTH_SECRET = 'a65AOqESdYl9GHyhqohaoYPGWsugYa2V1xi90zRn4pW4LzjCcgF3JUB3Z8YI4PNq5duUphxQ8zGOCwNKexDQ=='

const method = 'POST'
const url = 'https://api.unleashedsoftware.com/SalesOrders'
const queryString = ''

const signatureString = method + url + queryString

console.log('═'.repeat(70))
console.log('UNLEASHED AUTHENTICATION TEST')
console.log('═'.repeat(70))
console.log()
console.log('Input:')
console.log('  API Key:', API_AUTH_ID)
console.log('  API Secret:', API_AUTH_SECRET.substring(0, 20) + '...')
console.log('  Signature String:', signatureString)
console.log()

console.log('Calculating signature...')
const hmacHex = hmacSha256(API_AUTH_SECRET, signatureString)
const signature = hexToBase64(hmacHex)

console.log()
console.log('Results:')
console.log('  HMAC (hex):', hmacHex)
console.log('  Signature (base64):', signature)
console.log()

console.log('Headers to send:')
console.log('  api-auth-id:', API_AUTH_ID)
console.log('  api-auth-signature:', signature)
console.log()

console.log('═'.repeat(70))
console.log('TESTING WITH UNLEASHED API')
console.log('═'.repeat(70))
console.log()

// Test with actual API call
async function testAuth() {
  try {
    console.log('Making test request to Unleashed API...')
    console.log('URL:', url)
    console.log()

    const testBody = {
      OrderNumber: "TEST-" + Date.now(),
      OrderDate: new Date().toISOString(),
      OrderStatus: "Parked",
      Customer: {
        CustomerCode: "test@example.com",
        CustomerName: "Test Customer"
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-auth-id': API_AUTH_ID,
        'api-auth-signature': signature
      },
      body: JSON.stringify(testBody)
    })

    console.log('Response status:', response.status, response.statusText)
    console.log()

    const responseText = await response.text()
    console.log('Response body:')
    console.log(responseText)
    console.log()

    if (response.status === 403) {
      console.log('❌ 403 FORBIDDEN - Possible causes:')
      console.log('  1. API Key or Secret is incorrect')
      console.log('  2. HMAC signature calculation is wrong')
      console.log('  3. Account doesn\'t have permission to create sales orders')
      console.log('  4. API endpoint URL is incorrect')
      console.log()
    } else if (response.status === 401) {
      console.log('❌ 401 UNAUTHORIZED - Authentication failed')
      console.log('  The signature is being sent but is incorrect')
      console.log()
    } else if (response.status >= 200 && response.status < 300) {
      console.log('✅ SUCCESS - Authentication works!')
      console.log()
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testAuth()
