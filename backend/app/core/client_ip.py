import ipaddress
from functools import lru_cache

from starlette.requests import Request

from app.core.config import get_settings


@lru_cache
def _networks(raw: str) -> tuple:
    return tuple(ipaddress.ip_network(e.strip(), strict=False) for e in raw.split(",") if e.strip())


def _parse(value: str):
    try:
        return ipaddress.ip_address(value.strip())
    except ValueError:
        return None


def _is_trusted(address, networks) -> bool:
    return any(address in network for network in networks)


def get_client_ip(request: Request) -> str:
    peer = request.client.host if request.client else None
    if peer is None:
        return "unknown"
    peer_ip = _parse(peer)
    if peer_ip is None:
        return peer
    networks = _networks(get_settings().trusted_proxies)
    if not networks or not _is_trusted(peer_ip, networks):
        return str(peer_ip)
    forwarded = request.headers.get("x-forwarded-for")
    if not forwarded:
        return str(peer_ip)
    candidate = peer_ip
    for hop in reversed(forwarded.split(",")):
        parsed = _parse(hop)
        if parsed is None:
            return str(peer_ip)
        candidate = parsed
        if not _is_trusted(parsed, networks):
            break
    return str(candidate)
