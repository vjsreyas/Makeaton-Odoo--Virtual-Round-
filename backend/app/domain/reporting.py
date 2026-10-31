from decimal import Decimal
from sqlalchemy import select, func, and_, case
from app.domain.store import table, today

def report(db,ctx,from_date=None,to_date=None,customer_id=None,plan_id=None,status=None):
    inv=table(db,'invoices'); pay=table(db,'payments'); sub=table(db,'subscriptions')
    common=[inv.c.business_id==ctx.business_id, inv.c.status.in_(['confirmed','paid'])]
    if customer_id: common.append(inv.c.customer_id==customer_id)
    if plan_id: common.append(sub.c.plan_id==plan_id)
    if status: common.append(inv.c.status==status)
    invoice_filters=list(common)
    if from_date: invoice_filters.append(inv.c.issue_date>=from_date)
    if to_date: invoice_filters.append(inv.c.issue_date<=to_date)
    join=inv.join(sub,and_(sub.c.id==inv.c.subscription_id,sub.c.business_id==inv.c.business_id))
    overdue=and_(inv.c.status=='confirmed',inv.c.total>inv.c.amount_paid,inv.c.due_date<today(ctx))
    totals=db.execute(select(func.coalesce(func.sum(inv.c.total),0).label('invoiced_total'),func.coalesce(func.sum(inv.c.total-inv.c.amount_paid),0).label('outstanding_total'),func.coalesce(func.sum(case((overdue,inv.c.total-inv.c.amount_paid),else_=0)),0).label('overdue_amount'),func.count().filter(overdue).label('overdue_count')).select_from(join).where(*invoice_filters)).mappings().one()
    payment_filters=list(common)+[pay.c.business_id==ctx.business_id,pay.c.status=='recorded']
    if from_date: payment_filters.append(pay.c.paid_on>=from_date)
    if to_date: payment_filters.append(pay.c.paid_on<=to_date)
    pj=pay.join(join,and_(pay.c.invoice_id==inv.c.id,pay.c.business_id==inv.c.business_id))
    received=db.execute(select(func.coalesce(func.sum(pay.c.amount),0).label('amount'),func.count().label('count')).select_from(pj).where(*payment_filters)).mappings().one()
    methods=[dict(row) for row in db.execute(select(pay.c.method,func.sum(pay.c.amount).label('amount'),func.count().label('count')).select_from(pj).where(*payment_filters).group_by(pay.c.method)).mappings()]
    active_filters=[sub.c.business_id==ctx.business_id,sub.c.status=='active']
    if customer_id: active_filters.append(sub.c.customer_id==customer_id)
    if plan_id: active_filters.append(sub.c.plan_id==plan_id)
    active=db.scalar(select(func.count()).select_from(sub).where(*active_filters))
    recent=[dict(row) for row in db.execute(select(inv.c.id,inv.c.number,inv.c.customer_snapshot,inv.c.due_date,(inv.c.total-inv.c.amount_paid).label('balance')).select_from(join).where(*invoice_filters,overdue).order_by(inv.c.due_date).limit(10)).mappings()]
    months=[dict(row) for row in db.execute(select(func.to_char(pay.c.paid_on,'YYYY-MM').label('month'),func.sum(pay.c.amount).label('collected')).select_from(pj).where(*payment_filters).group_by('month').order_by('month')).mappings()]
    return {'active_subscriptions':active,'revenue_collected':received['amount'],'payments_count':received['count'],'invoiced_total':totals['invoiced_total'],'outstanding_total':totals['outstanding_total'],'overdue':{'count':totals['overdue_count'],'amount':totals['overdue_amount']},'payments_by_method':methods,'revenue_by_month':months,'recent_overdue_invoices':[{**row,'customer':row['customer_snapshot'].get('name'),'days_overdue':(today(ctx)-row['due_date']).days} for row in recent]}
