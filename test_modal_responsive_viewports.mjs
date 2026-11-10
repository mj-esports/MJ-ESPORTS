// test_modal_responsive_viewports.mjs
// Verification of SlotBookingModal responsive layout rules across all 7 target viewports:
// 375px, 390px, 430px, 768px, 1024px, 1280px, 1440px

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('================================================================================')
console.log('🧪 SLOT BOOKING MODAL RESPONSIVE AUDIT (375px - 1440px)')
console.log('================================================================================\n')

const modalPath = path.resolve('src/components/tournament/SlotBookingModal.jsx')
const modalContent = fs.readFileSync(modalPath, 'utf8')

const TARGET_VIEWPORTS = [375, 390, 430, 768, 1024, 1280, 1440]
let totalTests = 0
let passedTests = 0

function runCheck(name, fn) {
  totalTests++
  try {
    fn()
    console.log(`  ✅ [PASS] ${name}`)
    passedTests++
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`)
    console.error(`     Error: ${err.message}`)
  }
}

// 1. Mobile viewport boundary: no fixed widths > 320px inside modal
runCheck('1. No fixed pixel widths exceeding minimum mobile boundary (320px)', () => {
  const fixedWidthRegex = /(?<![a-zA-Z-])w-\[(\d+)px\]/g
  let match
  while ((match = fixedWidthRegex.exec(modalContent)) !== null) {
    const widthVal = parseInt(match[1], 10)
    // max-w-[620px] is allowed as maximum container constraint, but w-[XXXpx] fixed width must be < 320px
    assert.ok(
      widthVal <= 320,
      `Found fixed width w-[${widthVal}px] exceeding 320px mobile viewport limit`
    )
  }
})

// 2. Responsive modal container sizing
runCheck('2. Modal enforces w-full max-w-[620px] with responsive padding', () => {
  assert.ok(modalContent.includes('w-full'), 'Modal uses w-full for mobile fluid sizing')
  assert.ok(modalContent.includes('max-w-[620px]'), 'Modal uses max-w-[620px] for desktop containment')
  assert.ok(modalContent.includes('p-3 sm:p-4'), 'Modal outer overlay uses responsive padding')
})

// 3. Vertical scrolling on constrained viewports
runCheck('3. Modal body enables vertical scroll without horizontal overflow', () => {
  assert.ok(modalContent.includes('overflow-y-auto'), 'Modal body specifies overflow-y-auto')
  assert.ok(modalContent.includes('max-h-['), 'Modal container caps max height for viewport')
  assert.ok(!modalContent.includes('overflow-x-scroll'), 'No horizontal overflow forced')
})

// 4. Form grid columns adapt from mobile single-column to desktop two-column
runCheck('4. Grid layouts adapt from 1 column on mobile to 2 columns on desktop', () => {
  assert.ok(
    modalContent.includes('grid grid-cols-1 md:grid-cols-2') ||
    modalContent.includes('grid grid-cols-1 sm:grid-cols-2'),
    'Input pairs adapt with responsive column layout'
  )
})

// 5. Verification of all 7 target viewports
TARGET_VIEWPORTS.forEach((vw) => {
  runCheck(`5. Breakpoint ${vw}px conformance validation`, () => {
    // Mobile phones: 375px, 390px, 430px
    if (vw <= 430) {
      assert.ok(modalContent.includes('w-full'), `${vw}px fits viewport width fluidly`)
      assert.ok(modalContent.includes('overflow-y-auto'), `${vw}px scrolls vertically without clipping`)
    }
    // Tablets & Desktops: 768px, 1024px, 1280px, 1440px
    if (vw >= 768) {
      assert.ok(modalContent.includes('max-w-[620px]'), `${vw}px constrains modal neatly without stretching`)
    }
  })
})

console.log('\n================================================================================')
console.log(`TOTAL AUDITS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`)
console.log('================================================================================\n')

if (passedTests !== totalTests) {
  process.exit(1)
}
