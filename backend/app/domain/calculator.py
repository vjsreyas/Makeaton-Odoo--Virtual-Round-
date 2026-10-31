"""Pure decimal pricing and anchor-preserving recurring calendar arithmetic."""
import calendar
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

ZERO = Decimal('0.00')
def money(value): return Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def period_start(anchor, interval, index):
    if interval == 'daily': return anchor + timedelta(days=index)
    if interval == 'weekly': return anchor + timedelta(days=7*index)
    months = index * (12 if interval == 'yearly' else 1)
    month_index = anchor.year*12 + anchor.month-1 + months
    year, month = divmod(month_index, 12)
    return date(year, month+1, min(anchor.day, calendar.monthrange(year, month+1)[1]))

def benefit(rule, base):
    return min(base, money(base*rule['value']/100) if rule['discount_type'] == 'percentage' else rule['value'])

def calculate(lines, rules, as_of):
    eligible = [r for r in rules if r['is_active'] and r['starts_on'] <= as_of and (r['ends_on'] is None or r['ends_on'] >= as_of) and (r['usage_limit'] is None or r['times_used'] < r['usage_limit'])]
    rows = []
    used = {}
    def consume(rule, amount):
        if amount > 0: used[rule['id']] = used.get(rule['id'], ZERO) + amount
    for line in lines:
        gross = money(line['unit_price']*line['quantity'])
        candidates = [r for r in eligible if r['scope']=='product' and r['product_id']==line['product_id'] and line['quantity']>=r['min_quantity'] and gross>=r['min_purchase_amount']]
        rule = sorted(candidates, key=lambda r: (-benefit(r,gross),str(r['id'])))[0] if candidates else None
        discount = benefit(rule,gross) if rule else ZERO
        if rule: consume(rule,discount)
        rows.append({**line, 'gross_amount': gross, 'discount_amount': discount, 'taxable_amount':gross-discount})
    subtotal = sum((r['gross_amount'] for r in rows), ZERO)
    base = sum((r['taxable_amount'] for r in rows), ZERO)
    quantity = sum(r['quantity'] for r in rows)
    candidates = [r for r in eligible if r['scope']=='subscription' and subtotal>=r['min_purchase_amount'] and quantity>=r['min_quantity']]
    if candidates and base:
        rule = sorted(candidates,key=lambda r:(-benefit(r,base),str(r['id'])))[0]
        amount = benefit(rule,base)
        shares = [money(amount*r['taxable_amount']/base) for r in rows]
        # Largest line absorbs the cent remainder, including HALF_UP over-allocation.
        largest = max(range(len(rows)),key=lambda i:rows[i]['taxable_amount'])
        remainder=amount-sum(shares,ZERO)
        order=sorted(range(len(rows)),key=lambda i:rows[i]['taxable_amount'],reverse=True)
        for i in order:
            if remainder==0: break
            adjustment=min(remainder,rows[i]['taxable_amount']-shares[i]) if remainder>0 else -min(-remainder,shares[i])
            shares[i]+=adjustment
            remainder-=adjustment
        for row,share in zip(rows,shares):
            row['discount_amount'] += share
            row['taxable_amount'] -= share
        consume(rule,amount)
    for row in rows:
        row['tax_amount'] = money(row['taxable_amount']*row['tax_rate']/100)
        row['line_total'] = row['taxable_amount']+row['tax_amount']
    discount = sum((r['discount_amount'] for r in rows),ZERO)
    tax = sum((r['tax_amount'] for r in rows),ZERO)
    return {'lines':rows,'subtotal':subtotal,'discount_total':discount,'tax_total':tax,'total':subtotal-discount+tax,'redemptions':used}
