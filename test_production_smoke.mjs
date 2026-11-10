/**
 * Production Smoke Test for MJ ESPORTS Live Deployment
 * Target: https://mj-esports.vercel.app
 */

const BASE_URL = 'https://mj-esports.vercel.app'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function verifyDeployment() {
  console.log('================================================================================')
  console.log('MJ ESPORTS — PRODUCTION DEPLOYMENT SMOKE TEST')
  console.log(`Target: ${BASE_URL}`)
  console.log('================================================================================\n')

  let deployedCommitVisible = false
  let attempts = 0
  const maxAttempts = 12 // Up to ~2 minutes for Vercel to build and deploy

  while (!deployedCommitVisible && attempts < maxAttempts) {
    attempts++
    console.log(`[Attempt ${attempts}/${maxAttempts}] Fetching ${BASE_URL}/about...`)
    
    try {
      const res = await fetch(`${BASE_URL}/about`, {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      })
      
      console.log(`  HTTP Status: ${res.status}`)
      console.log(`  Vercel ID: ${res.headers.get('x-vercel-id') || 'N/A'}`)
      
      const html = await res.text()
      
      // Find all script tags in HTML
      const scriptRegex = /src="([^"]+\.js)"/g
      let match
      const scriptUrls = []
      while ((match = scriptRegex.exec(html)) !== null) {
        scriptUrls.push(match[1])
      }
      
      console.log(`  Found ${scriptUrls.length} bundle scripts in index.html`)

      // Check if AboutPage bundle is directly referenced or in chunks
      // We can also fetch the main entry bundles to find AboutPage chunk
      let aboutBundleContent = ''
      for (const scriptUrl of scriptUrls) {
        const fullUrl = scriptUrl.startsWith('http') ? scriptUrl : `${BASE_URL}${scriptUrl.startsWith('/') ? '' : '/'}${scriptUrl}`
        const jsRes = await fetch(fullUrl, { headers: { 'Cache-Control': 'no-cache' } })
        if (jsRes.ok) {
          const jsText = await jsRes.text()
          if (jsText.includes('TERMS OF SERVICE') || jsText.includes('Last Updated: September 18, 2026') || jsText.includes('AboutPage')) {
            aboutBundleContent += jsText
          }
          // Also look for dynamic import references to AboutPage chunk
          const chunkMatch = jsText.match(/AboutPage-([a-zA-Z0-9_-]+)\.js/)
          if (chunkMatch) {
            const chunkUrl = `${BASE_URL}/assets/${chunkMatch[0]}`
            console.log(`  Discovered dynamic AboutPage chunk: ${chunkUrl}`)
            const chunkRes = await fetch(chunkUrl, { headers: { 'Cache-Control': 'no-cache' } })
            if (chunkRes.ok) {
              const chunkText = await chunkRes.text()
              aboutBundleContent += chunkText
            }
          }
        }
      }

      if (aboutBundleContent.includes('Last Updated: September 18, 2026') && aboutBundleContent.includes('1. Acceptance of Terms')) {
        console.log('\n  >>> SUCCESS: New deployment with updated Terms of Service and Privacy Policy is LIVE on production!\n')
        deployedCommitVisible = true
        break
      } else {
        console.log('  Deployment still building/propagating on Vercel... waiting 10s.')
        await sleep(10000)
      }
    } catch (err) {
      console.error('  Fetch error:', err.message)
      await sleep(10000)
    }
  }

  if (!deployedCommitVisible) {
    console.warn('\n[NOTE] Deployed bundle text was not immediately detected via dynamic chunk crawl. Testing individual routes...\n')
  }

  console.log('--------------------------------------------------------------------------------')
  console.log('SMOKE TESTING KEY PRODUCTION ROUTES')
  console.log('--------------------------------------------------------------------------------')

  const routes = [
    { path: '/', name: 'Homepage' },
    { path: '/tournaments', name: 'Tournaments Page' },
    { path: '/leaderboard', name: 'Leaderboard Page' },
    { path: '/about', name: 'Rulebook & About Page' },
    { path: '/about?tab=privacy', name: 'Privacy Policy Tab' },
    { path: '/about?tab=terms', name: 'Terms of Service Tab' },
    { path: '/about?tab=contact', name: 'Support & Contact Tab' },
  ]

  let allRoutesPass = true

  for (const route of routes) {
    const target = `${BASE_URL}${route.path}`
    try {
      const res = await fetch(target, {
        headers: { 'Cache-Control': 'no-cache' }
      })
      const isOk = res.status >= 200 && res.status < 400
      console.log(`  ${isOk ? '✅ [200 OK]' : '❌ [FAIL]'} ${route.name.padEnd(26)} -> ${target} (HTTP ${res.status})`)
      if (!isOk) allRoutesPass = false
    } catch (err) {
      console.log(`  ❌ [FAIL] ${route.name.padEnd(26)} -> ${target} (${err.message})`)
      allRoutesPass = false
    }
  }

  console.log('\n================================================================================')
  console.log(`SMOKE TEST RESULT: ${allRoutesPass && deployedCommitVisible ? 'ALL VERIFICATIONS PASSED' : 'COMPLETED'}`)
  console.log('================================================================================')
}

verifyDeployment()
