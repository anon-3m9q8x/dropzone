"""Combat integration checks using real inputs and WebGL; no game-state injection."""
import os,json,re
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.getenv('DROPZONE_BASE_URL','http://127.0.0.1:3500/')
OUT=Path(os.getenv('DROPZONE_SCREENSHOTS','/tmp/dropzone-combat'));OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 context=browser.new_context(viewport={'width':1440,'height':1000});page=context.new_page();page.set_default_timeout(15000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE)
 assert page.locator('.mode-card').count()==3
 page.screenshot(path=str(OUT/'combat-home.png'),full_page=True)
 def enter(mode):
  page.locator(f'.mode-{mode} button').click();page.locator('.pause-card .primary').click();page.wait_for_function('document.pointerLockElement!==null');page.wait_for_function("!document.querySelector('.overlay')")
 def leave():
  if not page.locator('.overlay').count():page.keyboard.press('Escape');page.wait_for_selector('.overlay')
  page.get_by_role('button',name='ホームへ戻る').click()
 enter('training');page.mouse.down(button='right');page.mouse.down();page.wait_for_timeout(800);page.mouse.up();page.mouse.up(button='right');assert int(page.locator('.range-stats b').nth(1).inner_text())>=1
 page.screenshot(path=str(OUT/'target-down.png'));page.wait_for_timeout(1500)
 page.keyboard.press('Digit3');page.mouse.down(button='right');page.wait_for_timeout(400);page.screenshot(path=str(OUT/'dmr-scope.png'));page.mouse.up(button='right');page.keyboard.press('Digit1')
 page.keyboard.press('KeyV');page.wait_for_timeout(200);assert page.locator('.range-top').inner_text().count('一人称')==1;assert page.locator('.crosshair').is_visible();page.screenshot(path=str(OUT/'first-person.png'));leave()
 enter('cpu');page.mouse.down(button='right');page.mouse.down();page.wait_for_function("Number(document.querySelectorAll('.range-stats b')[1].textContent)>=1");page.mouse.up();page.mouse.up(button='right');page.wait_for_timeout(150);kills=int(page.locator('.range-stats b').nth(1).inner_text());assert kills>=1;page.screenshot(path=str(OUT/'cpu-combat.png'));leave()
 enter('br');assert page.locator('.minimap').is_visible();assert page.locator('.range-stats b').nth(3).inner_text().endswith('m');page.screenshot(path=str(OUT/'battle-royale.png'))
 page.wait_for_selector('.pause-card h1',timeout=60000);assert page.locator('.pause-card h1').inner_text() in ['ELIMINATED','VICTORY','TIME UP'];record=json.loads(page.evaluate("localStorage.getItem('dropzone-battle-records-v1')"));assert len(record)==1 and record[0]['mode']=='br';page.screenshot(path=str(OUT/'battle-result.png'))
 page.get_by_role('button',name=re.compile('もう一度プレイ')).click();page.get_by_text('準備はいいですか？').wait_for();assert page.locator('.range-stats b').nth(1).inner_text()=='0';assert page.locator('canvas').count()==1;leave()
 page.get_by_role('button',name='▥ 戦績').click();assert page.locator('.record-row').count()==1
 page.get_by_role('button',name='⌂ ホーム').click()
 for width in [320,390,820,1440]:
  page.set_viewport_size({'width':width,'height':1000});page.wait_for_timeout(200);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
  if width<900:assert page.locator('.mode-card button:disabled').count()==3
 assert not errors,errors
 print(json.dumps({'result':'PASS','cpuKills':kills,'records':len(record),'checks':['three modes','target down','first-person only','humanoid screenshots','CPU elimination with actual shots','BR zone/minimap','BR result and record','retry cleanup','responsive modes'],'errors':errors},ensure_ascii=False));browser.close()
