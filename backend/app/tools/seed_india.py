"""Idempotent Indian presentation dataset, persisted through the domain services.

Only the explicitly named qa-demo-a / qa-demo-b businesses are populated. Existing
financial records are never truncated or replaced. Run with python -m app.tools.seed_india.
"""
from calendar import monthrange
from datetime import date, timedelta
from types import SimpleNamespace
from sqlalchemy import select
from app.core.db import get_session_factory
from app.models import Business, User, Membership, StaffPermission, CustomerProfile
from app.domain.store import table, get, insert, update, today
from app.domain.service import catalog_save, save_subscription, subscription_action, invoice_action, payment_create
from app.domain.billing import run_billing
from app.auth.passwords import hash_password

CUSTOMERS=[('Lakshmi Traders','Bengaluru, Karnataka'),('Sri Sai Stores','Hyderabad, Telangana'),('Kaveri Textiles','Mysuru, Karnataka'),('Malabar Foods','Kochi, Kerala'),('Pune Design Studio','Pune, Maharashtra'),('Jaipur Book House','Jaipur, Rajasthan'),('Coimbatore Auto Parts','Coimbatore, Tamil Nadu'),('Vizag Travel Desk','Visakhapatnam, Andhra Pradesh')]

def seed(db,business):
    owner=db.scalar(select(User).where(User.email==('qa.owner.a@brightloop.test' if business.slug=='qa-demo-a' else 'qa.owner.b@brightloop.test')))
    if not owner: return
    business.name='Brightloop Software India' if business.slug=='qa-demo-a' else 'Sahyadri Business Services'
    owner.full_name='Priya Sharma' if business.slug=='qa-demo-a' else 'Ananya Nair'
    db.flush()
    ctx=SimpleNamespace(user=owner,business=business,business_id=business.id,role='business_admin')
    local=today(ctx); start=local.replace(day=1); end=date(local.year+1,local.month,monthrange(local.year+1,local.month)[1])
    existing=table(db,'products')
    if db.scalar(select(existing.c.id).where(existing.c.business_id==business.id,existing.c.name=='Odoo ERP')):
        print(f'{business.slug}: dataset already exists'); return
    tax=catalog_save(db,ctx,'tax-rules',{'name':'GST 18%','rate_percent':18})
    names=[('Odoo ERP',5000,3000),('Accounting Software',2499,1000),('Inventory Management',4999,2000),('Phone & Email Support',500,200),('Starter Business',1499,600),('Business Annual',24000,10000),('Basic Billing',999,400)]
    products=[catalog_save(db,ctx,'products',{'name':name,'product_type':'addon' if index==3 else 'software','sales_price':price,'cost_price':cost,'notes':'Billing and business management for Indian small businesses.','default_tax_rule_id':tax['id']}) for index,(name,price,cost) in enumerate(names)]
    variant=insert(db,ctx,'product_variants',{'product_id':products[0]['id'],'attribute':'Brand','value':'Odoo','extra_price':560})
    plans=[catalog_save(db,ctx,'plans',{'name':product['name']+(' Yearly' if index==5 else ' Monthly'),'product_id':product['id'],'price':product['sales_price'],'billing_interval':'yearly' if index==5 else 'monthly','min_quantity':1,'available_from':date(local.year,1,1),'auto_close_on_expiry':True,'allow_early_close':True,'allow_pause':index!=5,'allow_renewal':True}) for index,product in enumerate(products)]
    for interval,price in [('daily',99),('weekly',499)]:
        catalog_save(db,ctx,'plans',{'name':'Starter '+interval.title(),'product_id':products[4]['id'],'price':price,'billing_interval':interval,'min_quantity':1,'available_from':date(local.year,1,1),'allow_pause':True,'allow_renewal':True,'allow_early_close':True,'auto_close_on_expiry':True})
    catalog_save(db,ctx,'discount-rules',{'name':'10-user team offer','discount_type':'percentage','value':10,'scope':'subscription','product_id':None,'min_purchase_amount':0,'min_quantity':10,'starts_on':start,'ends_on':start.replace(day=monthrange(start.year,start.month)[1]),'usage_limit':20})
    catalog_save(db,ctx,'discount-rules',{'name':'New branch welcome offer','discount_type':'fixed','value':500,'scope':'product','product_id':products[2]['id'],'min_purchase_amount':9000,'min_quantity':2,'starts_on':start,'ends_on':start.replace(day=monthrange(start.year,start.month)[1]),'usage_limit':10})
    template=catalog_save(db,ctx,'quotation-templates',{'name':'Odoo ERP — 10 users','plan_id':plans[0]['id'],'validity_days':14,'payment_terms_days':15,'lines':[{'product_id':products[0]['id'],'variant_id':variant['id'],'quantity':10}]})
    profile_table=table(db,'customer_profiles')
    portal_user=db.scalar(select(User).where(User.email=='qa.customer@brightloop.test'))
    profile=db.execute(select(profile_table).where(profile_table.c.business_id==business.id,profile_table.c.user_id==portal_user.id)).mappings().first() if portal_user else None
    customers=[]
    for index,(name,city) in enumerate(CUSTOMERS):
        if index==0 and profile:
            customer=update(db,ctx,'customer_profiles',profile['id'],{'name':name,'billing_address':city+', India','phone':'Not provided'})
        else:
            customer=catalog_save(db,ctx,'customers',{'name':name,'email':f"accounts{index+1}.{business.slug}@brightloop.test",'billing_address':city+', India','tax_id':f'FICTIONAL-GST-{index+1:03d}'})
        customers.append(customer)
    selections=[0,1,2,4,5,6,2,4]
    amounts=['20000','0','3000','1768.82','28320','0','0','1768.82']
    terms=[15,22,35,15,15,15,40,15]
    subs=[]
    for index,customer in enumerate(customers):
        pi=selections[index]
        line={'product_id':products[pi]['id'],'variant_id':variant['id'] if index==0 else None,'quantity':10 if index==0 else 2 if index==6 else 1,'unit_price':None,'tax_rule_id':tax['id']}
        lines=[line]
        if index==2: lines.append({'product_id':products[3]['id'],'quantity':1,'unit_price':None,'tax_rule_id':tax['id']})
        sub=save_subscription(db,ctx,{'customer_id':customer['id'],'plan_id':plans[pi]['id'],'template_id':None,'start_date':start,'expiry_date':end,'payment_terms_days':terms[index],'lines':lines,'notes':'Indian business subscription'})
        subs.append(sub)
        if index!=5:
            for action in ('send-quotation','confirm','activate'): subscription_action(db,ctx,sub['id'],action,{})
    # Add a genuine quotation for the portal owner to accept and a paused subscription.
    quote=save_subscription(db,ctx,{'customer_id':customers[0]['id'],'template_id':template['id'],'plan_id':None,'start_date':local+timedelta(days=1),'expiry_date':end,'payment_terms_days':15,'lines':[]})
    subscription_action(db,ctx,quote['id'],'send-quotation',{})
    db.commit()
    run=run_billing(db,ctx,start)
    inv=table(db,'invoices')
    for index,sub in enumerate(subs):
        row=db.execute(select(inv).where(inv.c.business_id==business.id,inv.c.subscription_id==sub['id'])).mappings().first()
        if not row: continue
        if row['status']=='draft': invoice_action(db,ctx,row['id'],'confirm',{})
        if amounts[index]!='0':
            payment_create(db,ctx,row['id'],{'method':'bank_transfer' if index in (0,4) else 'upi' if index in (2,3) else 'card','amount':__import__('decimal').Decimal(amounts[index]),'paid_on':min(start+timedelta(days=9),local),'reference':f'INDIA-REF-{index+1:03d}','notes':'Payment received from customer'},key=f'seed-{sub["id"]}')
    # A pause is real and remains visible after restart.
    subscription_action(db,ctx,subs[7]['id'],'pause',{})
    db.commit()
    print(f'{business.slug}: {len(customers)} customers, {len(subs)+1} subscriptions, billing created {run["created_count"]} invoices')

def bootstrap(db):
    # Explicit opt-in seed command only; never changes passwords of existing users.
    accounts=[('qa.platform@brightloop.test','Platform Administrator',True),('qa.owner.a@brightloop.test','Priya Sharma',False),('qa.owner.b@brightloop.test','Ananya Nair',False),('qa.staff@brightloop.test','Arjun Menon',False),('qa.customer@brightloop.test','Ravi Kumar',False)]
    users={}
    for email,name,platform in accounts:
        user=db.scalar(select(User).where(User.email==email))
        if user is None:
            user=User(email=email,full_name=name,password_hash=hash_password('QaDemo!2026Pass'),is_platform_admin=platform,email_verified_at=__import__('datetime').datetime.now(__import__('datetime').timezone.utc))
            db.add(user);db.flush()
        users[email]=user
    for suffix in ('a','b'):
        business=db.scalar(select(Business).where(Business.slug=='qa-demo-'+suffix))
        if business is None:
            business=Business(name='Brightloop Software India' if suffix=='a' else 'Sahyadri Business Services',slug='qa-demo-'+suffix)
            db.add(business);db.flush()
        email='qa.owner.'+suffix+'@brightloop.test'
        if not db.scalar(select(Membership).where(Membership.business_id==business.id,Membership.user_id==users[email].id)):
            db.add(Membership(business_id=business.id,user_id=users[email].id,role='business_admin'))
        if suffix=='a' and not db.scalar(select(Membership).where(Membership.business_id==business.id,Membership.user_id==users['qa.staff@brightloop.test'].id)):
            member=Membership(business_id=business.id,user_id=users['qa.staff@brightloop.test'].id,role='business_staff')
            db.add(member);db.flush()
            for permission in ['products.view','plans.view','subscriptions.view']:
                db.add(StaffPermission(business_id=business.id,membership_id=member.id,permission=permission))
        if not db.scalar(select(CustomerProfile).where(CustomerProfile.business_id==business.id,CustomerProfile.user_id==users['qa.customer@brightloop.test'].id)):
            db.add(CustomerProfile(business_id=business.id,user_id=users['qa.customer@brightloop.test'].id,name='Lakshmi Traders',email='qa.customer@brightloop.test'))
    db.commit()

def main():
    with get_session_factory()() as db:
        bootstrap(db)
        for business in db.scalars(select(Business).where(Business.slug.in_(['qa-demo-a','qa-demo-b']))).all(): seed(db,business)
if __name__=='__main__': main()
