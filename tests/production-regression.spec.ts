import { expect, test } from '@playwright/test'

test.describe('production regression', () => {
  test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('wooaeyoung.feature-tour.v1', 'seen'))
  })

  test('home restores its pinned ScrollTrigger story after reload', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.story-stage')).toBeVisible()
    await expect.poll(() => page.locator('.pin-spacer').count()).toBeGreaterThan(0)

    await page.mouse.wheel(0, 2300)
    await expect.poll(() => page.locator('.story-root').getAttribute('data-step')).toBe('02')
    await expect(page.locator('.story-stage')).toHaveCSS('position', 'fixed')

    await page.reload()
    await expect.poll(() => page.locator('.pin-spacer').count()).toBeGreaterThan(0)
  })

  test('pet can move, pause, hide, and reappear', async ({ page }) => {
    await page.goto('/')
    const pet = page.locator('.roaming-pet')
    await expect(pet).toBeVisible()
    const initialLeft = await pet.evaluate(element => getComputedStyle(element).left)
    await page.waitForTimeout(900)
    await expect.poll(() => pet.evaluate(element => getComputedStyle(element).left)).not.toBe(initialLeft)

    await page.getByRole('button', { name: '펫 설정' }).click()
    await page.getByRole('button', { name: '걷기 멈추기' }).click()
    await page.getByRole('button', { name: '펫 설정' }).click()
    await expect(page.getByRole('button', { name: '걷기 재개' })).toBeVisible()
    await page.getByRole('button', { name: '펫 숨기기' }).click()
    await expect(page.getByRole('button', { name: '🐾 펫 보이기' })).toBeVisible()
    await page.getByRole('button', { name: '🐾 펫 보이기' }).click()
    await expect(pet).toBeVisible()
  })

  test('supplement analysis uses the live NIAS v3 API result', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: '영양제 분석' }).click()
    await page.getByRole('textbox', { name: '이름' }).fill('회귀테스트')
    await page.getByRole('spinbutton', { name: '체중(kg)' }).fill('10')
    await page.getByRole('spinbutton', { name: '나이' }).fill('36')
    await page.getByRole('button', { name: '추가' }).first().click()

    const [response] = await Promise.all([
      page.waitForResponse(candidate => candidate.url().includes('/api/v1/analyses') && candidate.request().method() === 'POST'),
      page.getByRole('button', { name: '맞춤 분석 시작하기' }).click(),
    ])
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.standardVersion).toBe('NIAS-v3')
    await expect(page.getByText('결과 18 종 성분')).toBeVisible()
  })

  test('mobile home keeps the story and pet controls visible', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' })
    await page.goto('/')
    await expect(page.locator('.story-stage')).toBeVisible()
    await expect(page.getByRole('button', { name: '펫 설정' })).toBeVisible()
    await page.screenshot({ path: 'test-results/mobile-home.png' })
    await page.close()
  })
})

test.describe('first visit feature tour', () => {
  test('introduces every page and can be started again', async ({ page }) => {
    await page.goto('/')
    const tour = page.getByRole('region', { name: '기능 둘러보기' })
    await expect(tour).toBeVisible({ timeout: 5_000 })
    await page.waitForTimeout(2_400)
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100)

    const expected = [
      '우애영의 돌봄 흐름을 한눈에',
      '필요한 기능으로 바로 이동',
      '분석 기준과 서비스 원칙',
      '급여 내용을 모아 맞춤 분석',
      '분석과 일상 기록을 이어서 관리',
      '외부 리포트를 가져오고 안전하게 정리',
      '사용법과 건강 안내를 빠르게 찾기',
      '같이 살펴보는 작은 안내 친구',
      '필요할 때 가까운 병원 확인',
      '궁금한 내용을 바로 물어보세요',
      '함께 다니는 작은 친구',
    ]
    for (let index = 0; index < expected.length; index += 1) {
      await expect(tour.getByRole('heading', { name: expected[index] })).toBeVisible()
      if (index === 2 || index === 3) {
        await page.waitForTimeout(2_400)
        expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
      }
      if (expected[index] === '궁금한 내용을 바로 물어보세요') {
        await expect(page.getByLabel('자비스 대화창')).toBeVisible()
        await expect(page.locator('.jarvis-msg.user')).toContainText('안녕 자비스', { timeout: 5_000 })
      }
      if (expected[index] === '함께 다니는 작은 친구') {
        await expect(page.getByRole('button', { name: '🐾 펫 보이기' })).toBeVisible({ timeout: 4_000 })
        const pet = page.getByRole('group', { name: '화면 속 반려견' })
        await expect(pet).toBeVisible({ timeout: 3_000 })
        const [petBox, cardBox] = await Promise.all([pet.boundingBox(), tour.locator('.feature-tour-card').boundingBox()])
        expect(petBox && cardBox && (petBox.x + petBox.width <= cardBox.x || cardBox.x + cardBox.width <= petBox.x || petBox.y + petBox.height <= cardBox.y || cardBox.y + cardBox.height <= petBox.y)).toBeTruthy()
      }
      if (index < expected.length - 1) await tour.getByRole('button', { name: '다음' }).click()
    }
    await page.screenshot({ path: 'test-results/feature-tour-desktop.png' })
    await tour.getByRole('button', { name: '둘러보기 완료' }).click()
    await expect(tour).toBeHidden()
    await page.reload()
    await page.waitForTimeout(1_800)
    await expect(tour).toBeHidden()
    await page.getByRole('button', { name: /기능 안내/ }).click()
    await expect(tour).toBeVisible()
    await page.waitForTimeout(2_400)
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100)
    await page.getByRole('button', { name: '고객센터', exact: true }).click()
    await expect(tour.getByRole('heading', { name: '사용법과 건강 안내를 빠르게 찾기' })).toBeVisible()
    await tour.getByRole('button', { name: '기능 안내 닫기' }).click()
    await expect(tour).toBeHidden()
    await page.getByRole('button', { name: '고객센터', exact: true }).click()
    await page.waitForTimeout(1_600)
    await expect(tour).toBeHidden()
    await page.getByRole('button', { name: '기능 안내', exact: true }).click()
    await expect(tour.getByRole('heading', { name: '우애영의 돌봄 흐름을 한눈에' })).toBeVisible()
    await expect(page.locator('.story-stage')).toBeVisible()
  })

  test('fits on a phone screen', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.getByRole('region', { name: '기능 둘러보기' })).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('button', { name: '기능 안내', exact: true })).toBeVisible()
    await page.screenshot({ path: 'test-results/feature-tour-mobile.png' })
    await page.close()
  })
})
