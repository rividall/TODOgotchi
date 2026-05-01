from fastapi import Request
from slowapi import Limiter


def _client_ip(request: Request) -> str:
    # Behind Cloudflare Tunnel the direct connection is the tunnel egress.
    # Cloudflare always sets CF-Connecting-IP to the real client; X-Forwarded-For
    # is a fallback for other reverse-proxy paths (local nginx, etc).
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=_client_ip)
