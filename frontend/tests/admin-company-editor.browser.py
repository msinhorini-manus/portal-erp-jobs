#!/usr/bin/env python3
import argparse,json,tempfile
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--expect-bug',action='store_true');p.add_argument('--base',default='http://127.0.0.1:5179');p.add_argument('--out',default=str(Path(tempfile.gettempdir())/'portal-erp-jobs-admin-editor-tests'));p.add_argument('--chromium',default='/usr/bin/chromium');a=p.parse_args()
assert urlsplit(a.base).scheme=='http' and urlsplit(a.base).hostname in {'127.0.0.1','localhost','::1'}, 'This fixture is restricted to a local server, never production'
r=Path(a.out);r.mkdir(mode=0o700,parents=True,exist_ok=True);checks=[];evidence=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=a.chromium,headless=True,args=['--no-sandbox','--no-proxy-server'])
 for mode in (['mouse'] if a.expect_bug else ['mouse','keyboard','keyboard-space','touch','scoped-admin','save-denied','native-validation','readonly-submit','pending-save','keyboard-save']):
  context=browser.new_context(viewport={'width':390 if mode=='touch' else 1280,'height':844 if mode=='touch' else 900},has_touch=mode=='touch');page=context.new_page();writes=[];errors=[];pending=[]
  company={'id':101,'name':'Empresa Teste A','email':'fixture@example.invalid','phone':'','city':'','state':'','is_member':False,'max_active_jobs':3,'site_status':'approved','global_active':True,'active_jobs':0,'jobs_count':0,'stats':{'total_jobs':0}}
  page.on('pageerror',lambda e:errors.append(str(e)))
  def api(route):
   req=route.request;path=req.url.split('/br/api/admin/',1)[1].split('?',1)[0];status=200
   if req.method=='GET' and path=='access-capabilities':body={'is_platform_admin':mode!='scoped-admin','can_approve_companies':mode!='scoped-admin'}
   elif req.method=='GET' and path=='companies':body={'companies':[company.copy()],'total':1,'pages':1}
   elif req.method=='GET' and path=='companies/101':body={'company':company.copy(),'jobs':[],'stats':{'total_jobs':0}}
   elif req.method=='PUT' and path=='companies/101':
    payload=req.post_data_json;writes.append(payload)
    if mode=='save-denied':status=403;body={'error':'Permissão de edição negada (teste isolado).'}
    else:company.update(payload);body={'company':company.copy()}
   else:raise AssertionError('unexpected test-only API operation '+req.method+' '+path)
   if req.method=='PUT' and mode=='pending-save':pending.append((route,body));return
   route.fulfill(status=status,content_type='application/json',body=json.dumps(body))
  page.route('**/br/api/admin/**',api)
  page.add_init_script("window.__submits=[];document.addEventListener('submit',e=>window.__submits.push({text:e.submitter?.textContent,type:e.submitter?.type}),true)")
  response=page.goto(a.base.rstrip('/')+'/tests/admin-company-editor.fixture.html',wait_until='networkidle');assert response.status==200
  page.get_by_role('button',name='Ver / editar',exact=True).click();dialog=page.get_by_role('dialog');dialog.get_by_role('heading',name='Detalhes da Empresa').wait_for()
  if mode=='readonly-submit':
   dialog.evaluate('(form)=>form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))');page.wait_for_timeout(100);assert writes==[] and dialog.is_visible();checks.append(mode+' readonly submit blocked')
  button=dialog.get_by_role('button',name='Editar',exact=True)
  if mode=='keyboard':button.focus();button.press('Enter')
  elif mode=='keyboard-space':button.focus();button.press('Space')
  elif mode=='touch':button.tap()
  else:button.click()
  page.wait_for_timeout(400)
  if a.expect_bug:
   row={'mode':mode,'edit_caused_put':len(writes)==1,'dialog_closed':page.get_by_role('dialog').count()==0,'success_toast':page.get_by_text('Dados da empresa atualizados. Aprovação não foi alterada.',exact=True).count()>0,'submitter':page.evaluate('window.__submits')};assert row['edit_caused_put'] and row['dialog_closed'] and row['success_toast'];evidence.append(row);context.close();continue
  assert writes==[];checks.append(mode+' Editar does not save')
  dialog.get_by_role('heading',name='Editar Empresa').wait_for();member=dialog.get_by_role('checkbox',name='Membro Portal ERP (não altera aprovação)',exact=True);assert not member.is_checked();checks.append(mode+' member editor visible')
  member.check();dialog.get_by_role('button',name='Cancelar',exact=True).click();assert writes==[];checks.append(mode+' Cancelar does not save')
  dialog.get_by_role('button',name='Editar',exact=True).click();member=dialog.get_by_role('checkbox',name='Membro Portal ERP (não altera aprovação)',exact=True);member.check()
  save=dialog.get_by_role('button',name='Salvar',exact=True);assert save.get_attribute('type')=='submit'
  if mode=='native-validation':
   dialog.get_by_role('spinbutton',name='Limite de vagas').fill('101');save.click();page.wait_for_timeout(100);assert writes==[] and dialog.is_visible();checks.append(mode+' native invalid limit blocks PUT');dialog.get_by_role('spinbutton',name='Limite de vagas').fill('3')
  if mode=='keyboard-save':dialog.get_by_role('textbox',name='Nome da empresa',exact=True).press('Enter')
  else:save.click()
  page.wait_for_timeout(150)
  if mode=='pending-save':
   assert save.is_disabled() and len(pending)==1
   dialog.evaluate('(form)=>{form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}))}');page.wait_for_timeout(100);assert len(writes)==1 and len(pending)==1;checks.append(mode+' pending submissions cannot duplicate PUT')
   route,body=pending.pop();route.fulfill(status=200,content_type='application/json',body=json.dumps(body))
  page.wait_for_timeout(450);assert len(writes)==1 and writes[0]['is_member'] is True and company['site_status']=='approved';checks.append(mode+' exactly one explicit save preserving approval')
  if mode=='save-denied':assert page.get_by_role('dialog').count()==1 and page.get_by_text('Permissão de edição negada (teste isolado).',exact=True).count()==1;checks.append(mode+' 403 keeps edit dialog and shows permission error')
  else:
   assert page.get_by_role('dialog').count()==0;page.get_by_role('button',name='Ver / editar',exact=True).click();dialog=page.get_by_role('dialog');dialog.get_by_text('Sim',exact=True).wait_for();assert dialog.get_by_text('Sim',exact=True).count()==1
   dialog.get_by_role('button',name='Editar',exact=True).click();member=dialog.get_by_role('checkbox',name='Membro Portal ERP (não altera aprovação)',exact=True);assert member.is_checked();member.uncheck();dialog.get_by_role('button',name='Salvar',exact=True).click();page.wait_for_timeout(100)
   if mode=='pending-save':
    assert len(pending)==1;route,body=pending.pop();route.fulfill(status=200,content_type='application/json',body=json.dumps(body))
   page.wait_for_timeout(400);assert len(writes)==2 and writes[-1]['is_member'] is False;checks.append(mode+' member removal is saved only explicitly')
  assert not errors;checks.append(mode+' no browser exceptions');context.close()
 browser.close()
report={'bug_reproduced':a.expect_bug,'passed':True,'assertions':checks,'evidence':evidence,'checks':len(checks),'production_requests':0,'real_companies_changed':0}
(r/('reproduction.json' if a.expect_bug else 'browser-regression.json')).write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
