#!/usr/bin/env tsx

/**
 * Download BigCommerce Theme via API
 *
 * Uses BigCommerce Themes API to download the active theme
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'

const STORE_HASH = process.env.BIGCOMMERCE_BOO_STORE_HASH || 'hhhi'
const ACCESS_TOKEN = process.env.BIGCOMMERCE_BOO_ACCESS_TOKEN || ''

async function downloadTheme() {
  if (!ACCESS_TOKEN) {
    console.log('❌ Error: BIGCOMMERCE_BOO_ACCESS_TOKEN not set')
    process.exit(1)
  }

  console.log('\n📥 BigCommerce Theme Downloader\n')
  console.log('Store: Buy Organics Online')
  console.log(`Store Hash: ${STORE_HASH}\n`)

  try {
    // Step 1: Get list of themes
    console.log('Step 1: Getting list of themes...\n')

    const themesResponse = await fetch(
      `https://api.bigcommerce.com/stores/${STORE_HASH}/v3/themes`,
      {
        headers: {
          'X-Auth-Token': ACCESS_TOKEN,
          'Accept': 'application/json',
        },
      }
    )

    if (!themesResponse.ok) {
      console.log(`❌ Error getting themes: ${themesResponse.status} ${themesResponse.statusText}`)
      const errorText = await themesResponse.text()
      console.log(`Response: ${errorText}\n`)
      return
    }

    const themesData = await themesResponse.json()
    console.log(`✅ Found ${themesData.data?.length || 0} theme(s)\n`)

    // Find active theme
    const activeTheme = themesData.data?.find((t: any) => t.is_active)

    if (!activeTheme) {
      console.log('⚠️  No active theme found\n')
      return
    }

    console.log('Active Theme:')
    console.log(`   Name: ${activeTheme.name}`)
    console.log(`   Version: ${activeTheme.version || 'N/A'}`)
    console.log(`   UUID: ${activeTheme.uuid}`)
    console.log('')

    // Step 2: Request theme download
    console.log('Step 2: Requesting theme download job...\n')

    const downloadJobResponse = await fetch(
      `https://api.bigcommerce.com/stores/${STORE_HASH}/v3/themes/${activeTheme.uuid}/actions/download`,
      {
        method: 'POST',
        headers: {
          'X-Auth-Token': ACCESS_TOKEN,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          which: 'last_activated'
        })
      }
    )

    if (!downloadJobResponse.ok) {
      console.log(`❌ Error requesting download: ${downloadJobResponse.status} ${downloadJobResponse.statusText}`)
      const errorText = await downloadJobResponse.text()
      console.log(`Response: ${errorText}\n`)
      return
    }

    const downloadJob = await downloadJobResponse.json()
    const jobId = downloadJob.job_id || downloadJob.data?.job_id

    if (!jobId) {
      console.log('❌ No job ID returned from download request\n')
      console.log('Response:', JSON.stringify(downloadJob, null, 2))
      return
    }

    console.log(`✅ Download job created: ${jobId}\n`)

    // Step 3: Poll for download URL
    console.log('Step 3: Waiting for download to be ready...\n')

    let downloadUrl: string | null = null
    let attempts = 0
    const maxAttempts = 30

    while (!downloadUrl && attempts < maxAttempts) {
      attempts++

      const jobStatusResponse = await fetch(
        `https://api.bigcommerce.com/stores/${STORE_HASH}/v3/themes/jobs/${jobId}`,
        {
          headers: {
            'X-Auth-Token': ACCESS_TOKEN,
            'Accept': 'application/json',
          },
        }
      )

      if (!jobStatusResponse.ok) {
        console.log(`⚠️  Error checking job status (attempt ${attempts}/${maxAttempts})`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }

      const jobStatus = await jobStatusResponse.json()

      if (jobStatus.data?.status === 'COMPLETED' && jobStatus.data?.result?.download_url) {
        downloadUrl = jobStatus.data.result.download_url
        console.log(`✅ Download ready after ${attempts} attempts\n`)
      } else if (jobStatus.data?.status === 'FAILED') {
        console.log('❌ Download job failed')
        console.log('Error:', JSON.stringify(jobStatus.data?.errors || jobStatus.data, null, 2))
        return
      } else {
        console.log(`   Attempt ${attempts}/${maxAttempts}: Status = ${jobStatus.data?.status || 'UNKNOWN'}`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    if (!downloadUrl) {
      console.log('\n❌ Timeout waiting for download URL\n')
      return
    }

    // Step 4: Download the theme file
    console.log('Step 4: Downloading theme file...\n')

    const themeResponse = await fetch(downloadUrl)

    if (!themeResponse.ok) {
      console.log(`❌ Error downloading theme: ${themeResponse.status} ${themeResponse.statusText}`)
      return
    }

    const themeDir = '/root/master-ops/buy-organics-online/theme'
    const zipPath = path.join(themeDir, 'theme.zip')

    // Save the file
    const fileStream = createWriteStream(zipPath)
    if (themeResponse.body) {
      await pipeline(themeResponse.body as any, fileStream)
      console.log(`✅ Theme downloaded to: ${zipPath}\n`)
    }

    // Step 5: Extract the theme
    console.log('Step 5: Extracting theme...\n')

    const { execSync } = await import('child_process')
    execSync(`cd ${themeDir} && unzip -q theme.zip && rm theme.zip`, { stdio: 'inherit' })

    console.log('✅ Theme extracted successfully\n')
    console.log('═══════════════════════════════════════════════════')
    console.log('📁 Theme Location:\n')
    console.log(`   ${themeDir}\n`)
    console.log('Next: Run analysis scripts to identify issues')
    console.log('═══════════════════════════════════════════════════\n')

  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
    console.log('')
    if (error instanceof Error && error.stack) {
      console.log('Stack trace:')
      console.log(error.stack)
    }
  }
}

downloadTheme()
