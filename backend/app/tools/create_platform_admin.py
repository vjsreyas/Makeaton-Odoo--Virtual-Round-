import argparse
import datetime as dt

from sqlalchemy import select

from app.auth.passwords import hash_password, password_policy_error
from app.core.db import get_session_factory
from app.models import User


def main() -> None:
    parser = argparse.ArgumentParser(description="Create (or promote) a Platform Admin")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", default="Platform Admin")
    args = parser.parse_args()
    error = password_policy_error(args.password)
    if error:
        raise SystemExit(f"password rejected: {error}")
    with get_session_factory()() as db:
        user = db.scalar(select(User).where(User.email == args.email))
        if user is None:
            user = User(email=args.email, full_name=args.name, password_hash=hash_password(args.password),
                        is_platform_admin=True, email_verified_at=dt.datetime.now(dt.timezone.utc))
            db.add(user)
            print(f"created platform admin {args.email}")
        else:
            user.is_platform_admin = True
            print(f"{args.email} already exists; platform admin flag set (password unchanged)")
        db.commit()


if __name__ == "__main__":
    main()
