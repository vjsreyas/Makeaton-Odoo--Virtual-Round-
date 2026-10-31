from datetime import timedelta, date
from decimal import Decimal
from uuid import uuid4
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from sqlalchemy import select, func, and_, or_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.domain.store import table, get, insert, update, audit, today, now, invalid, encode
from app.domain.calculator import money, calculate, period_start
from app.core.errors import AppError
from app.notifications.outbox import enqueue_email

RESOURCE_TABLES = {'products':'products','plans':'plans','customers':'customer_profiles','tax-rules':'tax_rules','discount-rules':'discount_rules','quotation-templates':'quotation_templates'}

def number(db,ctx,kind):
    t=table(db,'number_sequences')
    db.execute(pg_insert(t).values(business_id=ctx.business_id,kind=kind,next_value=1).on_conflict_do_nothing())
    value=db.execute(t.update().where(t.c.business_id==ctx.business_id,t.c.kind==kind).values(next_value=t.c.next_value+1).returning(t.c.next_value)).scalar_one()-1
    return ('SUB' if kind=='subscription' else 'INV')+f'-{value:06d}'

def validate_catalog(db,ctx,resource,data):
    for field,parent in [('product_id','products'),('plan_id','plans'),('default_tax_rule_id','tax_rules')]:
        if data.get(field): get(db,ctx,parent,data[field])
    if resource=='plans' and data.get('available_to') and data['available_to']<data['available_from']: invalid('End date must not precede start date','available_to')
    if resource=='discount-rules':
        if (data['scope']=='product') != bool(data.get('product_id')): invalid('Product is required only for product-scope discounts','product_id')
        if data['discount_type']=='percentage' and data['value']>100: invalid('Percentage cannot exceed 100','value')
        if data.get('ends_on') and data['ends_on']<data['starts_on']: invalid('End date must not precede start date','ends_on')
        if data.get('usage_limit') is not None and data['usage_limit']<data.get('times_used',0): invalid('Usage limit is below existing redemptions','usage_limit')

def catalog_save(db,ctx,resource,body,row_id=None):
    name=RESOURCE_TABLES[resource]
    before=get(db,ctx,name,row_id,True) if row_id else None
    data=body.copy(); lines=data.pop('lines',None)
    validate_catalog(db,ctx,resource,{**(before or {}),**data})
    row=update(db,ctx,name,row_id,data) if row_id else insert(db,ctx,name,data)
    if resource=='quotation-templates' and lines is not None:
        t=table(db,'quotation_template_lines')
        db.execute(t.delete().where(t.c.business_id==ctx.business_id,t.c.template_id==row['id']))
        for position,line in enumerate(lines):
            product=get(db,ctx,'products',line['product_id'])
            if line.get('variant_id'):
                variant=get(db,ctx,'product_variants',line['variant_id'])
                if variant['product_id']!=product['id']: invalid('Variant does not belong to product','variant_id')
            insert(db,ctx,'quotation_template_lines',{'template_id':row['id'],'product_id':product['id'],'variant_id':line.get('variant_id'),'quantity':line['quantity'],'position':position})
    audit(db,ctx,resource+'.'+('update' if before else 'create'),name,row['id'],before,row)
    db.flush()
    return row

def catalog_detail(db,ctx,resource,row_id):
    row=get(db,ctx,RESOURCE_TABLES[resource],row_id)
    if resource in ('products','quotation-templates'):
        name='product_variants' if resource=='products' else 'quotation_template_lines'
        t=table(db,name); key='product_id' if resource=='products' else 'template_id'
        row['variants' if resource=='products' else 'lines']=[dict(r) for r in db.execute(select(t).where(t.c.business_id==ctx.business_id,t.c[key]==row_id).order_by(t.c.created_at,t.c.id)).mappings()]
    return row

def subscription_lines(db,ctx,sub):
    t=table(db,'subscription_lines')
    rows=[dict(row) for row in db.execute(select(t).where(t.c.business_id==ctx.business_id,t.c.subscription_id==sub['id']).order_by(t.c.position)).mappings()]
    for row in rows:
        product=get(db,ctx,'products',row['product_id'])
        if not product['is_active']: invalid('Product is inactive','product_id','PRODUCT_INACTIVE')
        tax_id=row['tax_rule_id'] or product['default_tax_rule_id']
        tax=get(db,ctx,'tax_rules',tax_id) if tax_id else None
        if tax and not tax['is_active']: invalid('Tax rule is inactive','tax_rule_id','TAX_RULE_INACTIVE')
        row['tax_rule_id']=tax_id
        row['tax_rate']=tax['rate_percent'] if tax else Decimal(0)
    return rows

def actions(sub,plan,local_today):
    state=sub['status']; result=[]
    if state=='draft': result=['send-quotation','close']
    if state=='quotation': result=['confirm','close'] if sub['quotation_valid_until'] and sub['quotation_valid_until']>=local_today else ['close']
    if state=='confirmed' and sub['start_date']<=local_today: result=['activate']
    if state=='active':
        if plan['allow_pause']: result.append('pause')
        if plan['allow_renewal']: result.append('renew')
    if state=='paused': result.append('resume')
    if state in ('active','paused') and plan['allow_early_close']: result.append('close')
    return result

def subscription_detail(db,ctx,sub):
    if not isinstance(sub,dict): sub=get(db,ctx,'subscriptions',sub)
    customer=get(db,ctx,'customer_profiles',sub['customer_id']); plan=get(db,ctx,'plans',sub['plan_id'])
    t=table(db,'subscription_lines')
    lines=[dict(r) for r in db.execute(select(t).where(t.c.business_id==ctx.business_id,t.c.subscription_id==sub['id']).order_by(t.c.position)).mappings()]
    return {**sub,'customer':customer,'plan':plan,'lines':lines,'allowed_actions':actions(sub,plan,today(ctx))}

def save_subscription(db,ctx,data,row_id=None):
    before=get(db,ctx,'subscriptions',row_id,True) if row_id else None
    if before and before['status'] not in ('draft','quotation'): invalid('Only drafts and quotations can be edited',code='INVALID_STATE_TRANSITION',status=409)
    data={**data}; lines=data.pop('lines',[])
    if data.get('template_id'):
        template=catalog_detail(db,ctx,'quotation-templates',data['template_id'])
        if not template['is_active']: invalid('Template is inactive','template_id')
        data['plan_id']=data.get('plan_id') or template['plan_id']
        if not lines: lines=template['lines']
        data['payment_terms_days']=template['payment_terms_days']
        data['quotation_valid_until']=today(ctx)+timedelta(days=template['validity_days'])
    if not data.get('plan_id'): invalid('Select a plan','plan_id')
    plan=get(db,ctx,'plans',data['plan_id'])
    customer=get(db,ctx,'customer_profiles',data['customer_id'])
    if not customer['is_active']: invalid('Customer is inactive','customer_id')
    if not plan['is_active'] or data['start_date']<plan['available_from'] or (plan['available_to'] and data['start_date']>plan['available_to']): invalid('Plan is not available on the start date','plan_id')
    if data['expiry_date']<=data['start_date']: invalid('Expiry must be later than start','expiry_date')
    if not lines or len(lines)>100: invalid('Add 1 to 100 product lines','lines')
    if not any(line['product_id']==plan['product_id'] for line in lines): invalid('The plan product must be included','lines')
    resolved=[]
    for pos,line in enumerate(lines):
        product=get(db,ctx,'products',line['product_id'])
        if not product['is_active']: invalid('Product is inactive','product_id')
        if product['id']==plan['product_id'] and line['quantity']<plan['min_quantity']: invalid('Quantity is below the plan minimum','quantity')
        variant=get(db,ctx,'product_variants',line['variant_id']) if line.get('variant_id') else None
        if variant and (variant['product_id']!=product['id'] or not variant['is_active']): invalid('Variant is not available for this product','variant_id')
        tax_id=line.get('tax_rule_id') or product['default_tax_rule_id']
        if tax_id: get(db,ctx,'tax_rules',tax_id)
        price=line.get('unit_price')
        if price is None: price=(plan['price'] if product['id']==plan['product_id'] else product['sales_price'])+(variant['extra_price'] if variant else 0)
        resolved.append({'product_id':product['id'],'variant_id':variant['id'] if variant else None,'description':product['name']+(f" — {variant['attribute']}: {variant['value']}" if variant else ''),'quantity':line['quantity'],'unit_price':price,'tax_rule_id':tax_id,'position':pos})
    data['billing_interval']=plan['billing_interval']
    if not before: data.update(number=number(db,ctx,'subscription'),created_by=ctx.user.id if ctx.user else None)
    sub=update(db,ctx,'subscriptions',row_id,data) if before else insert(db,ctx,'subscriptions',data)
    t=table(db,'subscription_lines')
    db.execute(t.delete().where(t.c.business_id==ctx.business_id,t.c.subscription_id==sub['id']))
    for line in resolved: insert(db,ctx,'subscription_lines',dict(line,subscription_id=sub['id']))
    audit(db,ctx,'subscription.'+('update' if before else 'create'),'subscription',sub['id'],before,sub)
    return subscription_detail(db,ctx,sub)

def subscription_action(db,ctx,row_id,action,body):
    sub=get(db,ctx,'subscriptions',row_id,True); plan=get(db,ctx,'plans',sub['plan_id']); local=today(ctx)
    allowed=actions(sub,plan,local)
    if action not in allowed:
        flag={'pause':'allow_pause','renew':'allow_renewal','close':'allow_early_close'}.get(action)
        if flag and sub['status'] in ('active','paused') and not plan[flag]: invalid('This action is disabled by the plan',code='ACTION_NOT_ALLOWED_BY_PLAN',status=409)
        invalid('Action is not allowed in this state',code='INVALID_STATE_TRANSITION',status=409)
    changes={}
    if action=='send-quotation':
        validity=14
        if sub['template_id']: validity=get(db,ctx,'quotation_templates',sub['template_id'])['validity_days']
        changes={'status':'quotation','quotation_valid_until':local+timedelta(days=validity)}
        customer=get(db,ctx,'customer_profiles',sub['customer_id'])
        enqueue_email(db,to_email=customer['email'],subject=f"Quotation {sub['number']}",body=f"Dear {customer['name']}, your quotation {sub['number']} is valid until {changes['quotation_valid_until']}. Sign in to review and accept it.",kind='quotation.sent',business_id=ctx.business_id)
    elif action=='confirm': changes={'status':'confirmed','confirmed_at':now()}
    elif action=='activate': changes={'status':'active','activated_at':now(),'next_period_index':0,'next_period_start':sub['start_date']}
    elif action=='close': changes={'status':'closed','closed_at':now(),'close_reason':'rejected' if sub['status'] in ('draft','quotation') else 'early','next_period_start':None}
    elif action=='pause':
        changes={'status':'paused'}
        insert(db,ctx,'subscription_pauses',{'subscription_id':row_id,'paused_on':local})
    elif action=='resume':
        pauses=table(db,'subscription_pauses')
        pause=db.execute(select(pauses).where(pauses.c.business_id==ctx.business_id,pauses.c.subscription_id==row_id,pauses.c.resumed_on.is_(None)).with_for_update()).mappings().first()
        changes={'status':'active'}
        if pause:
            update(db,ctx,'subscription_pauses',pause['id'],{'resumed_on':local})
            index=sub['next_period_index']; skipped=[]
            while period_start(sub['start_date'],sub['billing_interval'],index)<local and period_start(sub['start_date'],sub['billing_interval'],index)>=pause['paused_on']:
                skipped.append(period_start(sub['start_date'],sub['billing_interval'],index)); index+=1
                if len(skipped)>10000: invalid('Pause window is too large')
            nxt=period_start(sub['start_date'],sub['billing_interval'],index)
            changes.update(next_period_index=index,next_period_start=nxt if nxt<=sub['expiry_date'] else None)
            if skipped:
                run=insert(db,ctx,'billing_runs',{'trigger':'manual','as_of_date':local,'status':'completed','skipped_count':len(skipped),'finished_at':now()})
                for start in skipped: insert(db,ctx,'billing_run_items',{'billing_run_id':run['id'],'subscription_id':row_id,'period_start':start,'outcome':'skipped','reason_code':'SUBSCRIPTION_PAUSED'})
    elif action=='renew':
        expiry=body.get('expiry_date')
        if not expiry or expiry<=sub['expiry_date']: invalid('New expiry must be later than current expiry','expiry_date')
        nxt=period_start(sub['start_date'],sub['billing_interval'],sub['next_period_index'])
        changes={'expiry_date':expiry,'next_period_start':sub['next_period_start'] or (nxt if nxt<=expiry else None)}
    updated=update(db,ctx,'subscriptions',row_id,changes)
    audit(db,ctx,'subscription.'+action,'subscription',row_id,sub,updated)
    return subscription_detail(db,ctx,updated)

def invoice_detail(db,ctx,row_id):
    invoice=get(db,ctx,'invoices',row_id)
    lines=table(db,'invoice_lines'); payments=table(db,'payments')
    invoice['lines']=[dict(r) for r in db.execute(select(lines).where(lines.c.business_id==ctx.business_id,lines.c.invoice_id==row_id).order_by(lines.c.created_at,lines.c.id)).mappings()]
    invoice['payments']=[dict(r) for r in db.execute(select(payments).where(payments.c.business_id==ctx.business_id,payments.c.invoice_id==row_id).order_by(payments.c.created_at)).mappings()]
    invoice['balance']=invoice['total']-invoice['amount_paid']
    invoice['payment_state']='paid' if invoice['balance']==0 else 'partial' if invoice['amount_paid'] else 'unpaid'
    invoice['is_overdue']=invoice['status']=='confirmed' and invoice['balance']>0 and invoice['due_date']<today(ctx)
    invoice['days_overdue']=(today(ctx)-invoice['due_date']).days if invoice['is_overdue'] else 0
    invoice['customer']=invoice['customer_snapshot']
    invoice['subscription_number']=get(db,ctx,'subscriptions',invoice['subscription_id'])['number']
    return invoice

def invoice_action(db,ctx,row_id,action,body):
    inv=get(db,ctx,'invoices',row_id,True); changes={}
    if action=='confirm' and inv['status']=='draft': changes={'status':'paid' if inv['total']==0 else 'confirmed','confirmed_at':now(),'paid_at':now() if inv['total']==0 else None}
    elif action=='cancel' and inv['status'] in ('draft','confirmed') and inv['amount_paid']==0:
        changes={'status':'cancelled','cancelled_at':now(),'cancel_reason':body.get('reason') or 'Cancelled by administrator'}
        red=table(db,'discount_redemptions'); rules=table(db,'discount_rules')
        rows=db.execute(select(red).where(red.c.business_id==ctx.business_id,red.c.invoice_id==row_id,red.c.released_at.is_(None)).order_by(red.c.discount_rule_id).with_for_update()).mappings().all()
        for row in rows:
            db.execute(rules.update().where(rules.c.business_id==ctx.business_id,rules.c.id==row['discount_rule_id']).values(times_used=rules.c.times_used-1))
            update(db,ctx,'discount_redemptions',row['id'],{'released_at':now()})
    elif action=='send' and inv['status'] in ('confirmed','paid'):
        customer=inv['customer_snapshot']; changes={'sent_at':now()}
        enqueue_email(db,to_email=customer['email'],subject=f"Invoice {inv['number']}",body=f"Dear {customer['name']}, invoice {inv['number']} totals {inv['currency']} {inv['total']}. Paid: {inv['amount_paid']}. Balance: {inv['total']-inv['amount_paid']}. Due: {inv['due_date']}.",kind='invoice.sent',business_id=ctx.business_id)
    else: invalid('Invoice action is not allowed in this state or has recorded payments',code='INVALID_STATE_TRANSITION',status=409)
    row=update(db,ctx,'invoices',row_id,changes); audit(db,ctx,'invoice.'+action,'invoice',row_id,inv,row)
    return invoice_detail(db,ctx,row_id)

def payment_create(db,ctx,invoice_id,data,key=None):
    inv=get(db,ctx,'invoices',invoice_id,True)
    pay=table(db,'payments')
    if key:
        prior=db.execute(select(pay).where(pay.c.business_id==ctx.business_id,pay.c.idempotency_key==key)).mappings().first()
        if prior:
            if prior['invoice_id']!=invoice_id or prior['amount']!=data['amount'] or prior['method']!=data['method'] or any(prior[field]!=data.get(field) for field in ('paid_on','reference','notes')): invalid('Idempotency key was used for a different payment',code='IDEMPOTENCY_CONFLICT',status=409)
            return dict(prior)
    if inv['status']!='confirmed': invalid('Only confirmed unpaid invoices can receive payments',code='INVOICE_NOT_PAYABLE',status=409)
    if data['amount']>inv['total']-inv['amount_paid']: invalid('Amount exceeds invoice balance','amount','PAYMENT_EXCEEDS_BALANCE')
    if data['paid_on']>today(ctx): invalid('Payment date cannot be in the future','paid_on')
    row=insert(db,ctx,'payments',{**data,'invoice_id':invoice_id,'recorded_by':ctx.user.id,'idempotency_key':key})
    paid=inv['amount_paid']+data['amount']; full=paid==inv['total']
    update(db,ctx,'invoices',invoice_id,{'amount_paid':paid,'status':'paid' if full else 'confirmed','paid_at':now() if full else None})
    audit(db,ctx,'payment.create','payment',row['id'],after=row)
    return row

def payment_void(db,ctx,row_id,body):
    # Invoice -> payment is the same lock order as payment creation.
    original=get(db,ctx,'payments',row_id)
    inv=get(db,ctx,'invoices',original['invoice_id'],True); payment=get(db,ctx,'payments',row_id,True)
    if payment['status']!='recorded': invalid('Payment is already voided',code='INVALID_STATE_TRANSITION',status=409)
    row=update(db,ctx,'payments',row_id,{'status':'voided','voided_at':now(),'void_reason':body.get('reason') or 'Payment reversed'})
    update(db,ctx,'invoices',inv['id'],{'amount_paid':inv['amount_paid']-payment['amount'],'status':'confirmed','paid_at':None})
    audit(db,ctx,'payment.void','payment',row_id,payment,row)
    return row
