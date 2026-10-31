"""One billing path for HTTP and the worker; session-level per-business lock."""
import hashlib
from datetime import timedelta
from sqlalchemy import select, text
from app.domain.store import table, get, insert, update, audit, today, now, invalid
from app.domain.calculator import period_start, calculate
from app.domain.service import number, subscription_lines
from app.core.errors import AppError

def bill_period(db,ctx,sub,as_of):
    index=sub['next_period_index']; start=period_start(sub['start_date'],sub['billing_interval'],index)
    end=min(period_start(sub['start_date'],sub['billing_interval'],index+1)-timedelta(days=1),sub['expiry_date'])
    invoices=table(db,'invoices')
    existing=db.execute(select(invoices.c.id).where(invoices.c.business_id==ctx.business_id,invoices.c.subscription_id==sub['id'],invoices.c.period_start==start)).scalar_one_or_none()
    invoice_id=existing
    if not existing:
        lines=subscription_lines(db,ctx,sub)
        rules=table(db,'discount_rules')
        discounts=[dict(row) for row in db.execute(select(rules).where(rules.c.business_id==ctx.business_id,rules.c.is_active.is_(True)).order_by(rules.c.id).with_for_update()).mappings()]
        pricing=calculate(lines,discounts,as_of)
        customer=get(db,ctx,'customer_profiles',sub['customer_id'])
        business=table(db,'businesses'); settings=db.execute(select(business).where(business.c.id==ctx.business_id)).mappings().one()
        confirmed=settings['auto_confirm_invoices']
        inv=insert(db,ctx,'invoices',{'number':number(db,ctx,'invoice'),'customer_id':sub['customer_id'],'subscription_id':sub['id'],'period_start':start,'period_end':end,'issue_date':as_of,'due_date':as_of+timedelta(days=sub['payment_terms_days']),'subtotal':pricing['subtotal'],'discount_total':pricing['discount_total'],'tax_total':pricing['tax_total'],'total':pricing['total'],'customer_snapshot':{key:str(customer[key]) if customer[key] is not None else None for key in ('id','name','email','phone','billing_address','tax_id')},'currency':ctx.business.currency})
        invoice_id=inv['id']
        for row in pricing['lines']:
            fields={key:row[key] for key in ('product_id','variant_id','description','quantity','unit_price','gross_amount','discount_amount','taxable_amount','tax_rule_id','tax_rate','tax_amount','line_total')}
            insert(db,ctx,'invoice_lines',dict(fields,invoice_id=invoice_id))
        for rule_id,amount in pricing['redemptions'].items():
            insert(db,ctx,'discount_redemptions',{'discount_rule_id':rule_id,'invoice_id':invoice_id,'amount':amount})
            db.execute(rules.update().where(rules.c.business_id==ctx.business_id,rules.c.id==rule_id).values(times_used=rules.c.times_used+1))
        if confirmed:
            update(db,ctx,'invoices',invoice_id,{'status':'paid' if pricing['total']==0 else 'confirmed','confirmed_at':now(),'paid_at':now() if pricing['total']==0 else None})
        audit(db,ctx,'invoice.create','invoice',invoice_id,after=inv)
    nxt=period_start(sub['start_date'],sub['billing_interval'],index+1)
    update(db,ctx,'subscriptions',sub['id'],{'next_period_index':index+1,'next_period_start':nxt if nxt<=sub['expiry_date'] else None})
    return invoice_id, bool(existing), start

def run_billing(db,ctx,as_of=None,subscription_id=None,trigger='manual',allow_future=False):
    as_of=as_of or today(ctx)
    if as_of>today(ctx) and not allow_future: invalid('Billing date cannot be in the future','as_of_date')
    if subscription_id: get(db,ctx,'subscriptions',subscription_id)
    # Dedicated connection owns the session lock across all run transactions.
    engine=getattr(db.get_bind(),'engine',db.get_bind())
    key=int.from_bytes(hashlib.sha256(('billing:'+str(ctx.business_id)).encode()).digest()[:8],signed=True)
    with engine.connect() as lock_conn:
        if not lock_conn.execute(text('SELECT pg_try_advisory_lock(:key)'),{'key':key}).scalar_one():
            raise AppError('BILLING_RUN_IN_PROGRESS','A billing run is already running for this business',409)
        try:
            run=insert(db,ctx,'billing_runs',{'trigger':trigger,'as_of_date':as_of,'triggered_by':ctx.user.id if ctx.user else None})
            subs=table(db,'subscriptions')
            maintenance=db.execute(select(subs).where(subs.c.business_id==ctx.business_id,subs.c.status.in_(['confirmed','quotation'])).with_for_update()).mappings().all()
            for row in maintenance:
                if row['status']=='confirmed' and row['start_date']<=as_of:
                    changed=update(db,ctx,'subscriptions',row['id'],{'status':'active','activated_at':now(),'next_period_start':row['start_date']})
                    audit(db,ctx,'subscription.activate','subscription',row['id'],dict(row),changed)
                elif row['status']=='quotation' and row['quotation_valid_until'] and row['quotation_valid_until']<as_of:
                    changed=update(db,ctx,'subscriptions',row['id'],{'status':'closed','closed_at':now(),'close_reason':'expired_quote'})
                    audit(db,ctx,'subscription.expire','subscription',row['id'],dict(row),changed)
            candidates=select(subs.c.id).where(subs.c.business_id==ctx.business_id,subs.c.status.in_(['active','paused']),subs.c.next_period_start<=as_of)
            if subscription_id: candidates=candidates.where(subs.c.id==subscription_id)
            ids=list(db.scalars(candidates.order_by(subs.c.id)))
            counts={'created':0,'skipped':0,'failed':0}
            for sid in ids:
                for attempt in range(50):
                    sub=get(db,ctx,'subscriptions',sid,True)
                    if not sub['next_period_start'] or sub['next_period_start']>as_of or sub['next_period_start']>sub['expiry_date']: break
                    start=sub['next_period_start']
                    if sub['status']=='paused':
                        insert(db,ctx,'billing_run_items',{'billing_run_id':run['id'],'subscription_id':sid,'period_start':start,'outcome':'skipped','reason_code':'SUBSCRIPTION_PAUSED'})
                        counts['skipped']+=1; break
                    try:
                        with db.begin_nested():
                            invoice_id,exists,start=bill_period(db,ctx,sub,as_of)
                            outcome='skipped' if exists else 'created'
                            insert(db,ctx,'billing_run_items',{'billing_run_id':run['id'],'subscription_id':sid,'period_start':start,'outcome':outcome,'reason_code':'ALREADY_INVOICED' if exists else None,'invoice_id':invoice_id})
                        counts[outcome]+=1
                    except Exception as exc:
                        code=exc.code if isinstance(exc,AppError) else 'CALCULATION_ERROR'
                        # Financial details stay in server logs; no raw SQL/parameters in API errors.
                        insert(db,ctx,'billing_run_items',{'billing_run_id':run['id'],'subscription_id':sid,'period_start':start,'outcome':'failed','reason_code':code,'message':str(exc) if isinstance(exc,AppError) else 'Could not generate this subscription invoice'})
                        counts['failed']+=1; break
                else:
                    sub=get(db,ctx,'subscriptions',sid)
                    if sub['next_period_start'] and sub['next_period_start']<=as_of:
                        insert(db,ctx,'billing_run_items',{'billing_run_id':run['id'],'subscription_id':sid,'period_start':sub['next_period_start'],'outcome':'skipped','reason_code':'CATCHUP_LIMIT'})
                        counts['skipped']+=1
            # Catch up financial periods before auto-closing expired subscriptions.
            expired=db.execute(select(subs).where(subs.c.business_id==ctx.business_id,subs.c.status=='active',subs.c.expiry_date<as_of)).mappings().all()
            for row in expired:
                plan=get(db,ctx,'plans',row['plan_id'])
                if plan['auto_close_on_expiry'] and row['next_period_start'] is None:
                    changed=update(db,ctx,'subscriptions',row['id'],{'status':'closed','close_reason':'auto','closed_at':now()})
                    audit(db,ctx,'subscription.auto_close','subscription',row['id'],dict(row),changed)
            result=update(db,ctx,'billing_runs',run['id'],{'status':'completed_with_errors' if counts['failed'] else 'completed','finished_at':now(),**{key+'_count':value for key,value in counts.items()}})
            audit(db,ctx,'billing.run','billing_run',run['id'],after=result)
            db.commit()
            return result
        except BaseException:
            db.rollback(); raise
        finally:
            lock_conn.execute(text('SELECT pg_advisory_unlock(:key)'),{'key':key})
            lock_conn.commit()
