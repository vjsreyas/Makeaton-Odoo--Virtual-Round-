"""Explicit isolated performance fixtures: 5,000 subscriptions / 30,000 invoices/payments.

Never truncates existing data. A separate performance-benchmark business keeps
these records out of presentation accounts. Run once; subsequent runs are no-ops.
"""
from datetime import date
from sqlalchemy import select,text
from app.core.db import get_session_factory
from app.models import Business,User,Membership
from app.auth.passwords import hash_password
from app.domain.store import table,insert
from types import SimpleNamespace

def main():
 with get_session_factory()() as db:
  if db.scalar(select(Business).where(Business.slug=='performance-benchmark')):
   print('Performance dataset already exists');return
  business=Business(name='Performance Benchmark',slug='performance-benchmark');db.add(business);db.flush()
  user=User(email='performance@brightloop.test',full_name='Performance Tester',password_hash=hash_password('QaDemo!2026Pass'),is_platform_admin=False);db.add(user);db.flush()
  db.add(Membership(business_id=business.id,user_id=user.id,role='business_admin'));db.flush()
  ctx=SimpleNamespace(business_id=business.id)
  customer=insert(db,ctx,'customer_profiles',{'name':'Benchmark Customer','email':'benchmark@brightloop.test'})
  product=insert(db,ctx,'products',{'name':'Benchmark Plan','product_type':'software','sales_price':100,'cost_price':50})
  plan=insert(db,ctx,'plans',{'name':'Benchmark Monthly','product_id':product['id'],'price':100,'billing_interval':'monthly','min_quantity':1,'available_from':date(2020,1,1)})
  params={'b':business.id,'c':customer['id'],'product':product['id'],'plan':plan['id'],'u':user.id}
  db.execute(text("""INSERT INTO subscriptions (business_id,number,customer_id,plan_id,status,billing_interval,start_date,expiry_date,payment_terms_days,next_period_index,next_period_start,created_by)
   SELECT :b,'SUB-PERF-'||n,:c,:plan,'active','monthly',(date_trunc('month',now())-interval '6 months')::date,(date_trunc('month',now())+interval '1 year')::date,15,7,(date_trunc('month',now())+interval '1 month')::date,:u FROM generate_series(1,5000) n"""),params)
  db.execute(text("""INSERT INTO invoices (business_id,number,customer_id,subscription_id,period_start,period_end,status,issue_date,due_date,subtotal,tax_total,total,amount_paid,customer_snapshot,currency)
   SELECT :b,'INV-PERF-'||s.number||'-'||p,:c,s.id,(date_trunc('month',now())-make_interval(months=>p))::date,(date_trunc('month',now())-make_interval(months=>p-1)-interval '1 day')::date,'draft',(date_trunc('month',now())-make_interval(months=>p))::date,(date_trunc('month',now())-make_interval(months=>p)+interval '15 days')::date,100,18,118,59,jsonb_build_object('name','Benchmark Customer','email','benchmark@brightloop.test'),'INR'
   FROM subscriptions s CROSS JOIN generate_series(1,6) p WHERE s.business_id=:b"""),params)
  db.execute(text("""INSERT INTO invoice_lines (business_id,invoice_id,product_id,description,quantity,unit_price,gross_amount,taxable_amount,tax_rate,tax_amount,line_total)
   SELECT :b,i.id,:product,'Monthly software licence',1,100,100,100,18,18,118 FROM invoices i WHERE i.business_id=:b"""),params)
  db.execute(text("UPDATE invoices SET status='confirmed',confirmed_at=now() WHERE business_id=:b"),params)
  db.execute(text("""INSERT INTO payments (business_id,invoice_id,method,amount,paid_on,reference,status,recorded_by)
   SELECT :b,i.id,'bank_transfer',59,i.issue_date+1,'BENCHMARK-'||i.number,'recorded',:u FROM invoices i WHERE i.business_id=:b"""),params)
  db.commit()
 print('Created performance-benchmark: 5000 subscriptions, 30000 invoices, 30000 payments, 30000 invoice lines')
if __name__=='__main__':main()
