"""Real-browser smoke checks. Requires Python Playwright and local Chromium."""
import os,json,re
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
BASE=os.getenv('DROPZONE_BASE_URL','http://127.0.0.1:3500')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 c=b.new_context(viewport={'width':1440,'height':1080});page=c.new_page();page.set_default_timeout(10000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE);page.get_by_role('button',name=re.compile('射撃練習を開始')).wait_for();page.screenshot(path=str(ROOT/'docs/screenshots/home-desktop.png'),full_page=True)
 assert page.locator('.primary').is_enabled()
 page.get_by_role('button',name='⚙ 設定').click();page.locator('input[type=range]').first.fill('1.5');page.locator('.toggle').nth(1).check();page.reload();page.get_by_role('button',name='⚙ 設定').click();assert page.locator('input[type=range]').first.input_value()=='1.5'
 page.get_by_role('button',name='⌂ ホーム').click();page.locator('.hero .primary').click();page.get_by_role('button',name=re.compile('^練習を開始')).click();page.wait_for_function('document.pointerLockElement!==null');page.wait_for_function("!document.querySelector('.overlay')")
 page.mouse.down(button='right');page.mouse.down();page.wait_for_timeout(1200);page.mouse.up();page.mouse.up(button='right');page.wait_for_timeout(150)
 shots=int(page.locator('.range-stats b').nth(0).inner_text());hits=int(page.locator('.range-stats b').nth(1).inner_text());assert shots>=5,(shots,hits);assert hits>0,(shots,hits)
 page.screenshot(path=str(ROOT/'docs/screenshots/training.png'))
 page.keyboard.press('Escape');page.wait_for_selector('.overlay');before=page.locator('.range-top').inner_text();page.wait_for_timeout(1200);after=page.locator('.range-top').inner_text();assert re.search(r'\d\d:\d\d',before).group()==re.search(r'\d\d:\d\d',after).group();assert int(page.locator('.range-stats b').nth(0).inner_text())==shots
 page.get_by_role('button',name=re.compile('^練習を再開')).click();page.wait_for_function('document.pointerLockElement!==null');page.wait_for_function("!document.querySelector('.overlay')");page.keyboard.press('Digit3');page.wait_for_function("document.querySelector('.ammo').innerText.startsWith('MARKSMAN')")
 page.mouse.down();page.wait_for_timeout(1100);page.mouse.up();page.wait_for_timeout(150);assert int(page.locator('.range-stats b').nth(0).inner_text())==shots+1
 page.evaluate("window.dispatchEvent(new Event('blur'))");page.wait_for_selector('.overlay');assert page.evaluate('document.pointerLockElement===null');page.get_by_role('button',name='ホームへ戻る').click();assert page.locator('canvas').count()==0
 for width in [320,390,820,1440]:
  page.set_viewport_size({'width':width,'height':1000});page.wait_for_timeout(200);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  if width<900:assert page.locator('.hero .primary').is_disabled()
  if width==390:page.screenshot(path=str(ROOT/'docs/screenshots/home-mobile.png'),full_page=True)
 page.set_viewport_size({'width':1440,'height':1080});page.get_by_role('button',name='? 操作ガイド').click();assert page.locator('.help-row').count()==10
 data=page.evaluate("JSON.parse(localStorage.getItem('dropzone-save-v1'))");assert data['stats']['matches']==0 and data['results']==[] and data['currentMatch'] is None
 # Corrupt/forward-version data must survive settings edits.
 page.evaluate("localStorage.setItem('dropzone-save-v1','{\"schemaVersion\":999}')");page.reload();page.get_by_role('button',name='⚙ 設定').click();page.locator('input[type=range]').first.fill('2');assert page.evaluate("localStorage.getItem('dropzone-save-v1')")=='{"schemaVersion":999}'
 assert not errors,errors
 # A browser with WebGL disabled displays a useful message, rather than a blank app.
 other=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-webgl']);pg=other.new_page(viewport={'width':1440,'height':1000});pg.goto(BASE);pg.locator('.hero .primary').click();pg.get_by_text('3D描画を開始できません。',exact=False).wait_for();pg.get_by_role('button',name='ホームへ戻る').click();other.close();b.close()
 print(json.dumps({'result':'PASS','shots':shots,'hits':hits,'checks':['desktop/mobile layout','settings reload','real pointer lock','ADS shooting/hits','pause/resume','DMR semi-auto','blur pause','canvas cleanup','future-save preservation','WebGL fallback'],'jsErrors':errors},ensure_ascii=False))
