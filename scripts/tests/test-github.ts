/**
 * Quick test script to verify GitHub integration
 *
 * Run with: npx tsx test-github.ts
 */

import * as dotenv from 'dotenv'

dotenv.config()

async function testGitHubIntegration() {
  console.log('🧪 Testing GitHub Integration...\n')

  const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN

  if (!token) {
    console.error('❌ Missing GITHUB_PERSONAL_ACCESS_TOKEN in .env file')
    process.exit(1)
  }

  console.log('🔍 Testing GitHub connection...')
  console.log(`   Token: ${token.substring(0, 10)}...\n`)

  try {
    // Test 1: Get user info
    console.log('1️⃣ Testing API: Getting user info...')
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!userResponse.ok) {
      throw new Error(`HTTP ${userResponse.status}: ${userResponse.statusText}`)
    }

    const userData = await userResponse.json() as { login: string; name: string; public_repos: number }
    console.log('✅ User Info:', {
      login: userData.login,
      name: userData.name,
      publicRepos: userData.public_repos,
    })
    console.log()

    // Test 2: List repositories
    console.log('2️⃣ Testing API: Listing repositories...')
    const reposResponse = await fetch('https://api.github.com/user/repos?per_page=5&sort=updated', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!reposResponse.ok) {
      throw new Error(`HTTP ${reposResponse.status}: ${reposResponse.statusText}`)
    }

    const repos = await reposResponse.json() as Array<{ name: string; full_name: string; private: boolean; updated_at: string }>
    console.log(`✅ Found ${repos.length} recent repositories`)

    if (repos.length > 0) {
      console.log('Most recent repo:', {
        name: repos[0].name,
        fullName: repos[0].full_name,
        private: repos[0].private,
        updatedAt: repos[0].updated_at,
      })
    }
    console.log()

    console.log('🎉 All tests passed! GitHub integration is working correctly.\n')

    return {
      success: true,
      username: userData.login,
      reposCount: userData.public_repos,
    }

  } catch (error) {
    console.error('❌ Error testing GitHub integration:', error)
    console.error('\nPlease check:')
    console.error('1. Your .env file has the correct GITHUB_PERSONAL_ACCESS_TOKEN')
    console.error('2. The token has the necessary permissions (repo scope)')
    console.error('3. Your GitHub account is accessible\n')

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Run the test
testGitHubIntegration()
  .then(result => {
    if (result.success) {
      console.log('Integration Summary:')
      console.log(`- Username: ${result.username}`)
      console.log(`- Public Repos: ${result.reposCount}`)
    }
    process.exit(result.success ? 0 : 1)
  })
  .catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
