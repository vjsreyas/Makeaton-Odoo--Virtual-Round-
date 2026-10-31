import calendar
import datetime as dt


def _add_months(start: dt.date, months: int) -> dt.date:
    index = start.month - 1 + months
    year = start.year + index // 12
    month = index % 12 + 1
    day = min(start.day, calendar.monthrange(year, month)[1])
    return dt.date(year, month, day)


def period_start(interval: str, start: dt.date, k: int) -> dt.date:
    if interval == "daily":
        return start + dt.timedelta(days=k)
    if interval == "weekly":
        return start + dt.timedelta(days=7 * k)
    if interval == "monthly":
        return _add_months(start, k)
    if interval == "yearly":
        return _add_months(start, 12 * k)
    raise ValueError(f"unknown interval {interval}")


def period_end(interval: str, start: dt.date, k: int, expiry: dt.date) -> dt.date:
    return min(period_start(interval, start, k + 1) - dt.timedelta(days=1), expiry)


def is_billable(interval: str, start: dt.date, k: int, expiry: dt.date) -> bool:
    return period_start(interval, start, k) <= expiry


def next_billable_index(interval: str, start: dt.date, expiry: dt.date, k: int) -> tuple[int, dt.date | None]:
    candidate = period_start(interval, start, k)
    if candidate > expiry:
        return k, None
    return k, candidate


MONTHLY_FACTOR = {"daily": 30, "weekly": 52 / 12, "monthly": 1, "yearly": 1 / 12}
