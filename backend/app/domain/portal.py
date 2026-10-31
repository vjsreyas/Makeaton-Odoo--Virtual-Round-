from types import SimpleNamespace
from uuid import UUID
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session
from app.auth.dependencies import get_auth_context
from app.core.db import get_db
from app.core.errors import AppError
from app.domain.store import table, get, update, audit, encode, paged, invalid
from app.domain import service as svc
from app.domain.reporting import report
from app.domain.router import print_invoice
from app.domain.schemas import Action

router=APIRouter(prefix='/portal')
def customer_context(auth=Depends(get_auth_context)):
    if auth.kind!='customer' or not auth.business or not auth.customer_id:
        raise AppError('FORBIDDEN','Customer access required',403)
    return SimpleNamespace(user=auth.user,business=auth.business,business_id=auth.business.id,customer_id=auth.customer_id,role='customer')
def own(db,ctx,name,row_id):
    row=get(db,ctx,name,row_id)
    if row['customer_id']!=ctx.customer_id: raise AppError('NOT_FOUND','Record not found',404)
    return row

@router.get('/summary')
def summary(ctx=Depends(customer_context),db:Session=Depends(get_db)):
    return {'data':encode(report(db,ctx,customer_id=ctx.customer_id))}

@router.get('/subscriptions')
def subscriptions(page:int=Query(1,ge=1),page_size:int=Query(25,ge=1,le=100),ctx=Depends(customer_context),db:Session=Depends(get_db)):
    return encode(paged(db,ctx,'subscriptions',page,page_size,customer_id=ctx.customer_id))

@router.get('/subscriptions/{row_id}')
def subscription(row_id:UUID,ctx=Depends(customer_context),db:Session=Depends(get_db)):
    row=own(db,ctx,'subscriptions',row_id)
    data=svc.subscription_detail(db,ctx,row)
    data['allowed_actions']=[{'confirm':'accept','close':'reject' if row['status']=='quotation' else 'close'}.get(action,action) for action in data['allowed_actions'] if action in ('confirm','close','pause','resume')]
    return {'data':encode(data)}

def add_action(action):
    @router.post('/subscriptions/{row_id}/'+action,name='portal_'+action)
    def transition(row_id:UUID,body:Action=Action(),ctx=Depends(customer_context),db:Session=Depends(get_db)):
        row=own(db,ctx,'subscriptions',row_id)
        t=table(db,'businesses'); enabled=db.scalar(select(t.c.customer_self_service).where(t.c.id==ctx.business_id))
        if not enabled: raise AppError('FORBIDDEN','Self-service is disabled for this business',403)
        if action in ('accept','reject') and row['status']!='quotation': invalid('Only quotations can be accepted or rejected',code='INVALID_STATE_TRANSITION',status=409)
        data=svc.subscription_action(db,ctx,row_id,{'accept':'confirm','reject':'close'}.get(action,action),body.model_dump())
        db.commit(); return {'data':encode(data)}
for action in ('accept','reject','pause','resume','close'): add_action(action)

@router.get('/invoices')
def invoices(page:int=Query(1,ge=1),page_size:int=Query(25,ge=1,le=100),ctx=Depends(customer_context),db:Session=Depends(get_db)):
    result=paged(db,ctx,'invoices',page,page_size,customer_id=ctx.customer_id)
    # Drafts are internal documents, so never expose them through the portal.
    t=table(db,'invoices'); clauses=[t.c.business_id==ctx.business_id,t.c.customer_id==ctx.customer_id,t.c.status!='draft']
    rows=db.execute(select(t).where(*clauses).order_by(t.c.issue_date.desc()).offset((page-1)*page_size).limit(page_size)).mappings().all()
    total=db.scalar(select(func.count()).select_from(t).where(*clauses))
    return encode({'data':[dict(row) for row in rows],'meta':{'page':page,'page_size':page_size,'total':total,'total_pages':(total+page_size-1)//page_size}})

@router.get('/invoices/{row_id}')
def invoice(row_id:UUID,ctx=Depends(customer_context),db:Session=Depends(get_db)):
    row=own(db,ctx,'invoices',row_id)
    if row['status']=='draft': raise AppError('NOT_FOUND','Invoice not found',404)
    return {'data':encode(svc.invoice_detail(db,ctx,row_id))}

@router.get('/invoices/{row_id}/print')
def invoice_print(row_id:UUID,ctx=Depends(customer_context),db:Session=Depends(get_db)):
    row=own(db,ctx,'invoices',row_id)
    if row['status']=='draft': raise AppError('NOT_FOUND','Invoice not found',404)
    return print_invoice(db,ctx,row_id)

@router.get('/payments')
def payments(page:int=Query(1,ge=1),page_size:int=Query(25,ge=1,le=100),ctx=Depends(customer_context),db:Session=Depends(get_db)):
    p=table(db,'payments'); i=table(db,'invoices'); join=p.join(i,and_(p.c.business_id==i.c.business_id,p.c.invoice_id==i.c.id))
    clauses=[p.c.business_id==ctx.business_id,i.c.customer_id==ctx.customer_id]
    total=db.scalar(select(func.count()).select_from(join).where(*clauses))
    rows=db.execute(select(p).select_from(join).where(*clauses).order_by(p.c.paid_on.desc()).offset((page-1)*page_size).limit(page_size)).mappings().all()
    return encode({'data':[dict(row) for row in rows],'meta':{'page':page,'page_size':page_size,'total':total,'total_pages':(total+page_size-1)//page_size}})

@router.get('/profile')
def profile(ctx=Depends(customer_context),db:Session=Depends(get_db)):
    return {'data':encode(get(db,ctx,'customer_profiles',ctx.customer_id))}

@router.patch('/profile')
def profile_update(body:dict=Body(...),ctx=Depends(customer_context),db:Session=Depends(get_db)):
    fields={key:value for key,value in body.items() if key in ('name','phone','billing_address','tax_id')}
    if not fields or ('name' in fields and (not isinstance(fields['name'],str) or not fields['name'].strip())): invalid('Provide valid profile fields')
    if any(value is not None and (not isinstance(value,str) or len(value)>1000) for value in fields.values()): invalid('Profile fields must be text up to 1000 characters')
    row=update(db,ctx,'customer_profiles',ctx.customer_id,fields); audit(db,ctx,'customer.profile_update','customer',ctx.customer_id,after=row)
    db.commit(); return {'data':encode(row)}
