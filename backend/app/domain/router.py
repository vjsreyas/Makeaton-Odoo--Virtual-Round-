from datetime import date
from types import SimpleNamespace
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from html import escape
from fastapi import APIRouter, Depends, Query, Header, Body
from fastapi.responses import HTMLResponse
from pydantic import ValidationError
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.errors import AppError
from app.auth.dependencies import get_auth_context, AuthContext
from app.tenancy.context import require, require_admin, require_platform, forbidden, get_tenant_context
from app.domain import schemas as S, service as svc
from app.domain.store import table, get, insert, update, audit, today, now, invalid, encode, paged
from app.domain.billing import run_billing
from app.domain.reporting import report

router=APIRouter()
def envelope(data): return {'data':encode(data)}
def commit(db,data): db.commit(); return envelope(data)

def catalog_routes(resource,schema,module,admin_only=False):
    name=svc.RESOURCE_TABLES[resource]
    @router.get('/'+resource, name='list_'+resource)
    def listing(page:int=Query(1,ge=1),page_size:int=Query(25,ge=1,le=100),q:str|None=None,sort:str='-created_at',is_active:bool|None=None,ctx=Depends(require(module+'.view')),db:Session=Depends(get_db)):
        result=paged(db,ctx,name,page,page_size,q,sort,{'is_active':is_active})
        return encode(result)
    @router.post('/'+resource,status_code=201,name='create_'+resource)
    def create(body:schema,ctx=Depends(require_admin if admin_only else require(module+'.create')),db:Session=Depends(get_db)):
        return commit(db,svc.catalog_save(db,ctx,resource,body.model_dump()))
    @router.get('/'+resource+'/{row_id}',name='get_'+resource)
    def detail(row_id:UUID,ctx=Depends(require(module+'.view')),db:Session=Depends(get_db)):
        return envelope(svc.catalog_detail(db,ctx,resource,row_id))
    @router.patch('/'+resource+'/{row_id}',name='update_'+resource)
    def patch(row_id:UUID,body:dict=Body(...),ctx=Depends(require_admin if admin_only else require(module+'.update')),db:Session=Depends(get_db)):
        existing=svc.catalog_detail(db,ctx,resource,row_id)
        try: validated=schema.model_validate({**existing,**body}).model_dump()
        except ValidationError as exc: invalid(str(exc),'body')
        fields={key:value for key,value in validated.items() if key in body}
        if not fields: invalid('No editable fields provided')
        return commit(db,svc.catalog_save(db,ctx,resource,fields,row_id))
    @router.post('/'+resource+'/{row_id}/deactivate',name='deactivate_'+resource)
    def deactivate(row_id:UUID,ctx=Depends(require_admin if admin_only else require(module+'.update')),db:Session=Depends(get_db)):
        before=get(db,ctx,name,row_id,True); row=update(db,ctx,name,row_id,{'is_active':False})
        audit(db,ctx,resource+'.deactivate',name,row_id,before,row)
        return commit(db,row)

for resource,schema,module,admin_only in [('products',S.Product,'products',False),('plans',S.Plan,'plans',False),('customers',S.Customer,'customers',False),('tax-rules',S.Tax,'taxes',True),('discount-rules',S.Discount,'discounts',True),('quotation-templates',S.Template,'quotations',False)]:
    catalog_routes(resource,schema,module,admin_only)

@router.get('/products/{row_id}/variants')
def variants(row_id:UUID,ctx=Depends(require('products.view')),db:Session=Depends(get_db)):
    return envelope(svc.catalog_detail(db,ctx,'products',row_id)['variants'])

@router.post('/products/{row_id}/variants',status_code=201)
def variant_create(row_id:UUID,body:S.Variant,ctx=Depends(require('products.create')),db:Session=Depends(get_db)):
    get(db,ctx,'products',row_id)
    row=insert(db,ctx,'product_variants',dict(body.model_dump(),product_id=row_id))
    audit(db,ctx,'variant.create','product_variant',row['id'],after=row)
    return commit(db,row)

@router.patch('/variants/{row_id}')
def variant_update(row_id:UUID,body:dict=Body(...),ctx=Depends(require('products.update')),db:Session=Depends(get_db)):
    prior=get(db,ctx,'product_variants',row_id,True)
    try: data=S.Variant.model_validate({**prior,**body}).model_dump()
    except ValidationError as exc: invalid(str(exc))
    row=update(db,ctx,'product_variants',row_id,data); audit(db,ctx,'variant.update','product_variant',row_id,prior,row)
    return commit(db,row)

@router.post('/customers/{row_id}/invite')
def customer_invite(row_id:UUID,ctx=Depends(require('customers.update')),db:Session=Depends(get_db)):
    from app.models import User, CustomerProfile
    from app.auth.service import issue_customer_invitation
    customer=get(db,ctx,'customer_profiles',row_id)
    if not customer['is_active']: invalid('Customer is inactive')
    user=db.scalar(select(User).where(User.email==customer['email']))
    if user is None:
        user=User(email=customer['email'],full_name=customer['name'],is_platform_admin=False)
        db.add(user); db.flush()
    profile=db.get(CustomerProfile,row_id)
    issue_customer_invitation(db,user,ctx.business,profile)
    audit(db,ctx,'customer.invite','customer',row_id)
    return commit(db,{'message':'Invitation sent'})

@router.get('/subscriptions')
def subscriptions(page:int=Query(1,ge=1),page_size:int=Query(25,ge=1,le=100),q:str|None=None,status:str|None=None,stage:str|None=None,customer_id:UUID|None=None,plan_id:UUID|None=None,sort:str='-created_at',ctx=Depends(get_tenant_context),db:Session=Depends(get_db)):
    if not ctx.allows('quotations.view' if stage=='quotation' else 'subscriptions.view'): raise forbidden()
    result=paged(db,ctx,'subscriptions',page,page_size,q,sort,{'status':status,'customer_id':customer_id,'plan_id':plan_id})
    if stage=='quotation':
        # Quotation-specific permission is independently checked on the same business context.
        if not ctx.allows('quotations.view'): raise forbidden()
        t=table(db,'subscriptions'); rows=db.execute(select(t).where(t.c.business_id==ctx.business_id,t.c.status.in_(['draft','quotation'])).order_by(t.c.created_at.desc()).offset((page-1)*page_size).limit(page_size)).mappings().all()
        total=db.scalar(select(func.count()).select_from(t).where(t.c.business_id==ctx.business_id,t.c.status.in_(['draft','quotation'])))
        result={'data':[dict(row) for row in rows],'meta':{'page':page,'page_size':page_size,'total':total,'total_pages':(total+page_size-1)//page_size}}
    # Bulk lookups avoid a query per row.
    customers=table(db,'customer_profiles'); plans=table(db,'plans')
    customer_names={r[0]:r[1] for r in db.execute(select(customers.c.id,customers.c.name).where(customers.c.business_id==ctx.business_id))}
    plan_names={r[0]:r[1] for r in db.execute(select(plans.c.id,plans.c.name).where(plans.c.business_id==ctx.business_id))}
    for row in result['data']: row.update(customer_name=customer_names.get(row['customer_id']),plan_name=plan_names.get(row['plan_id']))
    return encode(result)

@router.post('/subscriptions',status_code=201)
def subscription_create(body:S.Subscription,ctx=Depends(require('subscriptions.create')),db:Session=Depends(get_db)):
    return commit(db,svc.save_subscription(db,ctx,body.model_dump()))

@router.get('/subscriptions/{row_id}')
def subscription_get(row_id:UUID,ctx=Depends(require('subscriptions.view')),db:Session=Depends(get_db)):
    return envelope(svc.subscription_detail(db,ctx,row_id))

@router.patch('/subscriptions/{row_id}')
def subscription_patch(row_id:UUID,body:dict=Body(...),ctx=Depends(require('subscriptions.update')),db:Session=Depends(get_db)):
    prior=svc.subscription_detail(db,ctx,row_id)
    try: data=S.Subscription.model_validate({**prior,**body}).model_dump()
    except ValidationError as exc: invalid(str(exc))
    return commit(db,svc.save_subscription(db,ctx,data,row_id))

def add_subscription_action(action):
    @router.post('/subscriptions/{row_id}/'+action,name='subscription_'+action)
    def transition(row_id:UUID,body:S.Action=S.Action(),ctx=Depends(require('quotations.manage' if action=='send-quotation' else 'subscriptions.manage')),db:Session=Depends(get_db)):
        return commit(db,svc.subscription_action(db,ctx,row_id,action,body.model_dump()))
for action in ['send-quotation','confirm','activate','pause','resume','close','renew']: add_subscription_action(action)

@router.get('/subscriptions/{row_id}/history')
def subscription_history(row_id:UUID,ctx=Depends(require('subscriptions.view')),db:Session=Depends(get_db)):
    get(db,ctx,'subscriptions',row_id); t=table(db,'audit_logs')
    return envelope([dict(row) for row in db.execute(select(t).where(t.c.business_id==ctx.business_id,t.c.entity_id==row_id).order_by(t.c.created_at)).mappings()])

@router.get('/subscriptions/{row_id}/invoices')
def subscription_invoices(row_id:UUID,ctx=Depends(require('invoices.view')),db:Session=Depends(get_db)):
    get(db,ctx,'subscriptions',row_id)
    return encode(paged(db,ctx,'invoices',filters={'subscription_id':row_id}))

@router.get('/renewals')
def renewals(within_days:int=Query(30,ge=0,le=365),ctx=Depends(require('subscriptions.view')),db:Session=Depends(get_db)):
    t=table(db,'subscriptions')
    rows=db.execute(select(t).where(t.c.business_id==ctx.business_id,t.c.status.in_(['active','paused']),t.c.expiry_date<=today(ctx)+__import__('datetime').timedelta(days=within_days)).order_by(t.c.expiry_date).limit(100)).mappings().all()
    return envelope([dict(row) for row in rows])

@router.post('/billing-runs',status_code=202)
def billing_create(body:S.Billing,ctx=Depends(require_admin),db:Session=Depends(get_db)):
    return envelope(run_billing(db,ctx,body.as_of_date,body.subscription_id))

@router.get('/billing-runs')
def billing_list(page:int=Query(1,ge=1),page_size:int=Query(25,ge=1,le=100),ctx=Depends(require('billing_runs.view')),db:Session=Depends(get_db)):
    return encode(paged(db,ctx,'billing_runs',page,page_size,sort='-started_at'))

@router.get('/billing-runs/{row_id}')
def billing_get(row_id:UUID,ctx=Depends(require('billing_runs.view')),db:Session=Depends(get_db)):
    return envelope(get(db,ctx,'billing_runs',row_id))

@router.get('/billing-runs/{row_id}/items')
def billing_items(row_id:UUID,page:int=Query(1,ge=1),page_size:int=Query(25,ge=1,le=100),outcome:str|None=None,ctx=Depends(require('billing_runs.view')),db:Session=Depends(get_db)):
    get(db,ctx,'billing_runs',row_id)
    return encode(paged(db,ctx,'billing_run_items',page,page_size,filters={'billing_run_id':row_id,'outcome':outcome}))

@router.get('/invoices')
def invoices(page:int=Query(1,ge=1),page_size:int=Query(25,ge=1,le=100),q:str|None=None,status:str|None=None,customer_id:UUID|None=None,subscription_id:UUID|None=None,overdue:bool|None=None,from_date:date|None=Query(None,alias='from'),to_date:date|None=Query(None,alias='to'),ctx=Depends(require('invoices.view')),db:Session=Depends(get_db)):
    t=table(db,'invoices'); clauses=[t.c.business_id==ctx.business_id]
    for key,value in [('status',status),('customer_id',customer_id),('subscription_id',subscription_id)]:
        if value is not None: clauses.append(t.c[key]==value)
    if q: clauses.append(or_(t.c.number.ilike('%'+q+'%'),t.c.customer_snapshot['name'].astext.ilike('%'+q+'%')))
    if overdue: clauses.extend([t.c.status=='confirmed',t.c.total>t.c.amount_paid,t.c.due_date<today(ctx)])
    if from_date: clauses.append(t.c.issue_date>=from_date)
    if to_date: clauses.append(t.c.issue_date<=to_date)
    total=db.scalar(select(func.count()).select_from(t).where(*clauses))
    rows=[]
    for row in db.execute(select(t).where(*clauses).order_by(t.c.created_at.desc(),t.c.id).offset((page-1)*page_size).limit(page_size)).mappings():
        row=dict(row); row['balance']=row['total']-row['amount_paid']; row['is_overdue']=row['status']=='confirmed' and row['balance']>0 and row['due_date']<today(ctx)
        row['payment_state']='paid' if row['balance']==0 else 'partial' if row['amount_paid'] else 'unpaid'; rows.append(row)
    return encode({'data':rows,'meta':{'page':page,'page_size':page_size,'total':total,'total_pages':(total+page_size-1)//page_size}})

@router.post('/invoices/bulk-confirm')
def bulk_confirm(body:S.Bulk,ctx=Depends(require('invoices.manage')),db:Session=Depends(get_db)):
    data=[svc.invoice_action(db,ctx,row_id,'confirm',{}) for row_id in body.ids]
    return commit(db,data)

@router.get('/invoices/{row_id}')
def invoice_get(row_id:UUID,ctx=Depends(require('invoices.view')),db:Session=Depends(get_db)):
    return envelope(svc.invoice_detail(db,ctx,row_id))

def add_invoice_action(action):
    @router.post('/invoices/{row_id}/'+action,name='invoice_'+action)
    def transition(row_id:UUID,body:S.Action=S.Action(),ctx=Depends(require('invoices.manage')),db:Session=Depends(get_db)):
        return commit(db,svc.invoice_action(db,ctx,row_id,action,body.model_dump()))
for action in ['confirm','cancel','send']: add_invoice_action(action)

def print_invoice(db,ctx,row_id):
    invoice=svc.invoice_detail(db,ctx,row_id)
    esc=lambda value:escape(str(value))
    rows=''.join(f"<tr><td>{esc(line['description'])}</td><td>{line['quantity']}</td><td>{line['unit_price']}</td><td>{line['discount_amount']}</td><td>{line['tax_amount']}</td><td>{line['line_total']}</td></tr>" for line in invoice['lines'])
    return HTMLResponse(f"<!doctype html><html><head><meta charset='utf-8'><title>{esc(invoice['number'])}</title><style>body{{font:14px sans-serif;margin:40px;color:#172020}}table{{width:100%;border-collapse:collapse}}td,th{{padding:10px;border-bottom:1px solid #ccc;text-align:left}}@media print{{button{{display:none}}}}</style></head><body><h1>{esc(ctx.business.name)}</h1><h2>Invoice {esc(invoice['number'])}</h2><p>{esc(invoice['customer_snapshot']['name'])} · {esc(invoice['customer_snapshot']['email'])}</p><p>Issued {invoice['issue_date']} · Due {invoice['due_date']} · {esc(invoice['currency'])}</p><table><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Discount</th><th>Tax</th><th>Total</th></tr>{rows}</table><h3>Total: {esc(invoice['currency'])} {invoice['total']}</h3><p>Received: {invoice['amount_paid']} · Balance: {invoice['balance']}</p><button onclick='window.print()'>Print invoice</button></body></html>")

@router.get('/invoices/{row_id}/print',response_class=HTMLResponse)
def invoice_print(row_id:UUID,ctx=Depends(require('invoices.view')),db:Session=Depends(get_db)):
    return print_invoice(db,ctx,row_id)

@router.post('/invoices/{row_id}/payments',status_code=201)
def payment_create(row_id:UUID,body:S.Payment,idempotency_key:str|None=Header(None,max_length=200),ctx=Depends(require('payments.create')),db:Session=Depends(get_db)):
    return commit(db,svc.payment_create(db,ctx,row_id,body.model_dump(),idempotency_key))

@router.get('/payments')
def payments(page:int=Query(1,ge=1),page_size:int=Query(25,ge=1,le=100),invoice_id:UUID|None=None,method:str|None=None,ctx=Depends(require('payments.view')),db:Session=Depends(get_db)):
    return encode(paged(db,ctx,'payments',page,page_size,filters={'invoice_id':invoice_id,'method':method}))

@router.get('/payments/{row_id}')
def payment_get(row_id:UUID,ctx=Depends(require('payments.view')),db:Session=Depends(get_db)):
    return envelope(get(db,ctx,'payments',row_id))

@router.post('/payments/{row_id}/void')
def payment_void(row_id:UUID,body:S.Action=S.Action(),ctx=Depends(require('payments.manage')),db:Session=Depends(get_db)):
    return commit(db,svc.payment_void(db,ctx,row_id,body.model_dump()))

@router.get('/reports/dashboard')
@router.get('/reports/revenue')
@router.get('/reports/receivables')
@router.get('/reports/subscriptions-summary')
def reports(from_date:date|None=Query(None,alias='from'),to_date:date|None=Query(None,alias='to'),customer_id:UUID|None=None,plan_id:UUID|None=None,status:str|None=None,ctx=Depends(require('reports.view')),db:Session=Depends(get_db)):
    if from_date and to_date and to_date<from_date: invalid('End date must not precede start date','to')
    return envelope(report(db,ctx,from_date,to_date,customer_id,plan_id,status))

@router.get('/settings')
def settings_get(ctx=Depends(require_admin),db:Session=Depends(get_db)):
    t=table(db,'businesses'); row=db.execute(select(t).where(t.c.id==ctx.business_id)).mappings().one()
    return envelope(dict(row))

@router.patch('/settings')
def settings_update(body:S.Settings,ctx=Depends(require_admin),db:Session=Depends(get_db)):
    data=body.model_dump(exclude_unset=True)
    if data.get('timezone'):
        try: ZoneInfo(data['timezone'])
        except (ZoneInfoNotFoundError,ValueError): invalid('Unknown timezone','timezone')
    if any(data.get(key) is None for key in ('name','timezone','currency','auto_confirm_invoices','default_payment_terms_days','customer_self_service') if key in data): invalid('Required settings cannot be empty')
    if 'currency' in data and data['currency']!=ctx.business.currency:
        inv=table(db,'invoices')
        if db.scalar(select(func.count()).select_from(inv).where(inv.c.business_id==ctx.business_id)): invalid('Currency cannot change after invoicing','currency')
    t=table(db,'businesses'); row=dict(db.execute(t.update().where(t.c.id==ctx.business_id).values(**data).returning(t)).mappings().one())
    audit(db,ctx,'settings.update','business',ctx.business_id,after=row)
    return commit(db,row)

@router.get('/audit-logs')
def audit_logs(page:int=Query(1,ge=1),page_size:int=Query(25,ge=1,le=100),ctx=Depends(require_admin),db:Session=Depends(get_db)):
    return encode(paged(db,ctx,'audit_logs',page,page_size))

@router.get('/notifications')
def notifications(page:int=Query(1,ge=1),page_size:int=Query(25,ge=1,le=100),auth:AuthContext=Depends(get_auth_context),db:Session=Depends(get_db)):
    t=table(db,'notifications')
    rows=db.execute(select(t.c.id,t.c.kind,t.c.subject,t.c.status,t.c.created_at,t.c.channel).where(t.c.business_id==auth.business.id if auth.business else t.c.business_id.is_(None),or_(t.c.user_id==auth.user.id,t.c.to_email==auth.user.email)).order_by(t.c.created_at.desc()).offset((page-1)*page_size).limit(page_size)).mappings().all()
    return envelope([dict(row) for row in rows])

@router.post('/notifications/{row_id}/read')
def notification_read(row_id:UUID,auth:AuthContext=Depends(get_auth_context),db:Session=Depends(get_db)):
    t=table(db,'notifications')
    row=db.execute(select(t).where(t.c.id==row_id,t.c.user_id==auth.user.id,t.c.channel=='in_app')).mappings().first()
    if not row: raise AppError('NOT_FOUND','Notification not found',404)
    db.execute(t.update().where(t.c.id==row_id).values(status='read'))
    return commit(db,{'id':row_id,'status':'read'})

@router.get('/platform/stats')
def platform_stats(auth=Depends(require_platform),db:Session=Depends(get_db)):
    result={}
    for name in ['businesses','users','subscriptions']:
        t=table(db,name); result[name]=db.scalar(select(func.count()).select_from(t))
    return envelope(result)

@router.get('/platform/audit-logs')
def platform_audit(page:int=Query(1,ge=1),auth=Depends(require_platform),db:Session=Depends(get_db)):
    t=table(db,'audit_logs'); rows=db.execute(select(t).where(t.c.business_id.is_(None)).order_by(t.c.created_at.desc()).offset((page-1)*25).limit(25)).mappings().all()
    return envelope([dict(row) for row in rows])
