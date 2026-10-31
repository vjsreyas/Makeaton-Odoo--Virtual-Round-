"""SQLAlchemy Core repository over the existing, migration-owned schema.

All tenant operations require a server-resolved context; callers cannot supply a
business id through request fields. The existing composite FKs remain a second guard.
"""
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID
from zoneinfo import ZoneInfo
from threading import RLock
from sqlalchemy import MetaData, select, func, or_
from app.core.errors import AppError
from app.audit.service import record

_metadata = {}
_lock = RLock()

def table(db, name):
    bind = db.get_bind()
    engine = getattr(bind, 'engine', bind)
    with _lock:
        if engine not in _metadata:
            metadata = MetaData()
            metadata.reflect(bind=bind)
            _metadata[engine] = metadata
    return _metadata[engine].tables[name]

def encode(value):
    if isinstance(value, Decimal): return str(value)
    if isinstance(value, UUID): return str(value)
    if isinstance(value, (datetime, date)): return value.isoformat()
    if hasattr(value, '_mapping'): value = dict(value._mapping)
    if isinstance(value, dict): return {key: encode(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)): return [encode(item) for item in value]
    return value

def today(ctx):
    return datetime.now(ZoneInfo(ctx.business.timezone)).date()

def now(): return datetime.now(timezone.utc)

def invalid(message, field='body', code='VALIDATION_ERROR', status=422):
    raise AppError(code, message, status_code=status, details=[{'field': field, 'message': message}])

def get(db, ctx, name, row_id, lock=False):
    t = table(db, name)
    query = select(t).where(t.c.business_id == ctx.business_id, t.c.id == row_id)
    if lock: query = query.with_for_update()
    row = db.execute(query).mappings().first()
    if row is None: raise AppError('NOT_FOUND', 'Record not found', 404)
    return dict(row)

def insert(db, ctx, name, values):
    t = table(db, name)
    return dict(db.execute(t.insert().values(**values, business_id=ctx.business_id).returning(t)).mappings().one())

def update(db, ctx, name, row_id, values):
    t = table(db, name)
    row = db.execute(t.update().where(t.c.business_id == ctx.business_id, t.c.id == row_id).values(**values).returning(t)).mappings().first()
    if not row: raise AppError('NOT_FOUND', 'Record not found', 404)
    return dict(row)

def audit(db, ctx, action, entity, entity_id, before=None, after=None):
    if ctx.user is not None:
        insert(db,ctx,'notifications',{'user_id':ctx.user.id,'channel':'in_app','kind':action,'subject':action.replace('.', ' ').replace('_', ' ').title(),'body':f'{entity}: {entity_id}','status':'pending'})
    record(db, action, actor_user_id=ctx.user.id if ctx.user else None, actor_role=ctx.role, business_id=ctx.business_id, entity_type=entity, entity_id=entity_id, before=encode(before), after=encode(after))

def paged(db, ctx, name, page=1, page_size=25, q=None, sort='-created_at', filters=None, customer_id=None):
    t = table(db, name)
    clauses = [t.c.business_id == ctx.business_id]
    if customer_id is not None:
        clauses.append(t.c.customer_id == customer_id)
    for key, value in (filters or {}).items():
        if value is not None and key in t.c: clauses.append(t.c[key] == value)
    if q:
        searchable = [t.c[key].ilike('%'+q+'%') for key in ('name','number','email','reference') if key in t.c]
        if searchable: clauses.append(or_(*searchable))
    column = sort.lstrip('-')
    if column not in t.c: invalid('Unknown sort field', 'sort')
    total = db.scalar(select(func.count()).select_from(t).where(*clauses))
    order = t.c[column].desc() if sort.startswith('-') else t.c[column].asc()
    rows = db.execute(select(t).where(*clauses).order_by(order, t.c.id).offset((page-1)*page_size).limit(page_size)).mappings().all()
    return {'data': [dict(row) for row in rows], 'meta': {'page': page, 'page_size': page_size, 'total': total, 'total_pages': (total+page_size-1)//page_size}}
